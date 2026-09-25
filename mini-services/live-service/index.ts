import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface Participant {
  socketId: string
  userId: string
  name: string
  role: string
  handRaised: boolean
  joinedAt: number
}

interface WhiteboardStroke {
  id: string
  points: { x: number; y: number }[]
  color: string
  width: number
  mode: 'draw' | 'erase'
}

interface RoomState {
  participants: Map<string, Participant>
  chat: { id: string; userId: string; name: string; role: string; content: string; at: number; type: string }[]
  strokes: WhiteboardStroke[]
  liveStartedBy?: string
}

const rooms = new Map<string, RoomState>()

const getRoom = (id: string): RoomState => {
  if (!rooms.has(id)) {
    rooms.set(id, { participants: new Map(), chat: [], strokes: [] })
  }
  return rooms.get(id)!
}

const participantsList = (room: RoomState) => Array.from(room.participants.values())
const safeId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

io.on('connection', (socket) => {
  let currentRoom: string | null = null
  let me: Participant | null = null

  socket.on('join-room', (data: { sessionId: string; userId: string; name: string; role: string }) => {
    // leave previous room if any
    if (currentRoom) {
      const room = rooms.get(currentRoom)
      if (room) {
        room.participants.delete(socket.id)
        socket.to(currentRoom).emit('participant-left', { socketId: socket.id, participants: participantsList(room) })
      }
    }

    currentRoom = data.sessionId
    const room = getRoom(data.sessionId)
    me = { socketId: socket.id, userId: data.userId, name: data.name, role: data.role, handRaised: false, joinedAt: Date.now() }
    room.participants.set(socket.id, me)
    socket.join(data.sessionId)

    socket.emit('room-state', {
      participants: participantsList(room),
      chat: room.chat.slice(-100),
      strokes: room.strokes,
    })
    socket.to(data.sessionId).emit('participant-joined', { participant: me, participants: participantsList(room) })
    socket.to(data.sessionId).emit('system', { content: `${data.name} وارد کلاس شد`, at: Date.now() })
    console.log(`[live] ${data.name} joined room ${data.sessionId}`)
  })

  socket.on('chat', (data: { sessionId: string; userId: string; name: string; role: string; content: string; type?: string }) => {
    const msg = {
      id: safeId(),
      userId: data.userId,
      name: data.name,
      role: data.role,
      content: String(data.content || '').slice(0, 1000),
      at: Date.now(),
      type: data.type || 'CHAT',
    }
    const room = getRoom(data.sessionId)
    room.chat.push(msg)
    if (room.chat.length > 300) room.chat.shift()
    io.to(data.sessionId).emit('chat', msg)
  })

  socket.on('hand-raise', (data: { sessionId: string; raised: boolean }) => {
    const room = getRoom(data.sessionId)
    const p = room.participants.get(socket.id)
    if (p) {
      p.handRaised = data.raised
      io.to(data.sessionId).emit('participants-update', { participants: participantsList(room) })
    }
  })

  // teacher controls live status
  socket.on('live-status', (data: { sessionId: string; live: boolean }) => {
    const room = getRoom(data.sessionId)
    if (data.live) room.liveStartedBy = socket.id
    io.to(data.sessionId).emit('live-status', { live: data.live, by: socket.id })
  })

  // whiteboard
  socket.on('stroke', (data: { sessionId: string; stroke: WhiteboardStroke }) => {
    const room = getRoom(data.sessionId)
    room.strokes.push(data.stroke)
    if (room.strokes.length > 500) room.strokes.shift()
    socket.to(data.sessionId).emit('stroke', { stroke: data.stroke })
  })

  socket.on('clear-board', (data: { sessionId: string }) => {
    const room = getRoom(data.sessionId)
    room.strokes = []
    io.to(data.sessionId).emit('clear-board')
  })

  // teacher can mute chat for all (simple toggle broadcast)
  socket.on('chat-mute', (data: { sessionId: string; muted: boolean }) => {
    socket.to(data.sessionId).emit('chat-mute', { muted: data.muted })
  })

  socket.on('leave-room', (data: { sessionId: string }) => {
    const room = rooms.get(data.sessionId)
    if (room) {
      room.participants.delete(socket.id)
      socket.to(data.sessionId).emit('participant-left', { socketId: socket.id, participants: participantsList(room) })
      socket.to(data.sessionId).emit('system', { content: `${me?.name || 'کاربر'} کلاس را ترک کرد`, at: Date.now() })
    }
    if (currentRoom) socket.leave(currentRoom)
    currentRoom = null
  })

  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom)
      if (room) {
        room.participants.delete(socket.id)
        socket.to(currentRoom).emit('participant-left', { socketId: socket.id, participants: participantsList(room) })
      }
    }
  })

  socket.on('error', (err) => console.error('[live] socket error', err))
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Live classroom service running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
