'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { api, useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toFa, faDateShort } from '@/lib/fa'
import { ROLE_LABELS } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import {
  X, Send, Users, Hand, MessageSquare, Presentation, Mic, MicOff, Video, VideoOff,
  Eraser, PenLine, PhoneOff, Radio, Crown, Loader2,
} from 'lucide-react'

interface Participant { socketId: string; userId: string; name: string; role: string; handRaised: boolean }
interface ChatMsg { id: string; userId: string; name: string; role: string; content: string; at: number; type: string }
interface Stroke { id: string; points: { x: number; y: number }[]; color: string; width: number; mode: 'draw' | 'erase' }
interface SessionInfo {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  status: string
  classGroup: { id: string; name: string; course: { title: string }; teacher?: { id: string; name: string } | null }
}

const COLORS = ['#0f766e', '#dc2626', '#2563eb', '#7c3aed', '#d97706']

export default function LiveClassroom() {
  const { liveSessionId, closeLive, user } = useApp()
  const { toast } = useToast()
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [handRaised, setHandRaised] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [chatMuted, setChatMuted] = useState(false)
  const [showBoard, setShowBoard] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [chatTab, setChatTab] = useState<'chat' | 'people'>('chat')

  const socketRef = useRef<{ emit: (e: string, d?: unknown) => void; disconnect: () => void; connected: boolean } | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const drawingRef = useRef(false)
  const currentStrokeRef = useRef<Stroke | null>(null)
  const [brushColor, setBrushColor] = useState(COLORS[0])
  const [eraserMode, setEraserMode] = useState(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const isTeacherHere = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'MANAGER'

  // ---- helpers (declared before effects) ----
  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamOn(false)
    setMicOn(false)
  }
  function getCtx() { return canvasRef.current?.getContext('2d') || null }
  function drawStroke(s: Stroke) {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.strokeStyle = s.mode === 'erase' ? '#ffffff' : s.color
    ctx.lineWidth = s.mode === 'erase' ? 30 : s.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    s.points.forEach((p, i) => {
      const x = p.x * canvas.width
      const y = p.y * canvas.height
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    if (s.points.length === 1) {
      const x = s.points[0].x * canvas.width
      const y = s.points[0].y * canvas.height
      ctx.lineTo(x + 0.5, y + 0.5)
    }
    ctx.stroke()
  }
  function redrawAll(strokes: Stroke[]) {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    strokes.forEach(drawStroke)
  }
  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Load session info
  useEffect(() => {
    if (!liveSessionId) return
    api<{ session: SessionInfo }>(`/api/sessions/${liveSessionId}`)
      .then((d) => setSession(d.session))
      .catch(() => {})
    api<{ messages: { id: string; userId?: string | null; userName: string; role: string; content: string; createdAt: string; type: string }[] }>(`/api/live-messages?sessionId=${liveSessionId}`)
      .then((d) =>
        setMessages(
          d.messages.map((m) => ({
            id: m.id,
            userId: m.userId || 'unknown',
            name: m.userName,
            role: m.role,
            content: m.content,
            at: new Date(m.createdAt).getTime(),
            type: m.type,
          }))
        )
      )
      .catch(() => {})
  }, [liveSessionId])

  // Socket connection
  useEffect(() => {
    if (!liveSessionId || !user) return
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    })
    socketRef.current = socket as unknown as typeof socketRef.current

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join-room', { sessionId: liveSessionId, userId: user.id, name: user.name, role: user.role })
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('room-state', (data: { participants: Participant[]; chat: ChatMsg[]; strokes: Stroke[] }) => {
      setParticipants(data.participants || [])
      if (data.chat?.length) setMessages((prev) => (prev.length === 0 ? data.chat : prev))
      strokesRef.current = data.strokes || []
      redrawAll(strokesRef.current)
    })
    socket.on('participant-joined', (data: { participants: Participant[] }) => setParticipants(data.participants))
    socket.on('participant-left', (data: { participants: Participant[] }) => setParticipants(data.participants))
    socket.on('chat', (msg: ChatMsg) => setMessages((prev) => [...prev, msg]))
    socket.on('system', (data: { content: string; at: number }) => {
      setMessages((prev) => [...prev, { id: 'sys-' + data.at, userId: 'sys', name: 'سیستم', role: 'SYSTEM', content: data.content, at: data.at, type: 'SYSTEM' }])
    })
    socket.on('participants-update', (data: { participants: Participant[] }) => setParticipants(data.participants))
    socket.on('hand-raise', () => {})
    socket.on('live-status', (data: { live: boolean }) => setIsLive(data.live))
    socket.on('stroke', (data: { stroke: Stroke }) => {
      strokesRef.current.push(data.stroke)
      drawStroke(data.stroke)
    })
    socket.on('clear-board', () => {
      strokesRef.current = []
      clearCanvas()
    })
    socket.on('chat-mute', (data: { muted: boolean }) => setChatMuted(data.muted))

    return () => {
      socket.emit('leave-room', { sessionId: liveSessionId })
      socket.disconnect()
      stopCam()
    }
     
  }, [liveSessionId, user])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // replay accumulated strokes when board opens
  useEffect(() => {
    if (showBoard) redrawAll(strokesRef.current)
  }, [showBoard])

  // Camera
  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCamOn(true)
    } catch {
      toast({ title: 'دسترسی به دوربین ممکن نیست', description: 'در این محیط دوربینی در دسترس نیست؛ اما بقیه امکانات کار می‌کند', variant: 'destructive' })
    }
  }
  const toggleMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: camOn, audio: true })
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setMicOn(!micOn)
    } catch {
      toast({ title: 'دسترسی به میکروفون ممکن نیست', variant: 'destructive' })
    }
  }

  // Live toggle (teacher)
  const toggleLive = async () => {
    if (!session) return
    const next = !isLive
    setIsLive(next)
    socketRef.current?.emit('live-status', { sessionId: session.id, live: next })
    try {
      await api(`/api/sessions/${session.id}`, { method: 'PATCH', body: JSON.stringify({ status: next ? 'LIVE' : 'COMPLETED' }) })
      toast({ title: next ? 'کلاس لایو شروع شد 🔴' : 'کلاس پایان یافت', description: next ? 'دانشجویان مطلع شدند' : 'امکان ثبت ضبط جلسه در پنل مدرس' })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const endClass = async () => {
    if (!session) return
    setIsLive(false)
    socketRef.current?.emit('live-status', { sessionId: session.id, live: false })
    try {
      await api(`/api/sessions/${session.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) })
    } catch { /* ignore */ }
    closeLive()
  }

  // Chat
  const sendChat = async () => {
    if (!chatInput.trim() || !session || !user) return
    const msg = { sessionId: session.id, userId: user.id, name: user.name, role: user.role, content: chatInput.trim() }
    socketRef.current?.emit('chat', msg)
    try {
      await api('/api/live-messages', { method: 'POST', body: JSON.stringify({ sessionId: session.id, content: chatInput.trim() }) })
    } catch { /* history persist best effort */ }
    setChatInput('')
  }

  const toggleHand = () => {
    if (!session) return
    const next = !handRaised
    setHandRaised(next)
    socketRef.current?.emit('hand-raise', { sessionId: session.id, raised: next })
  }

  // Whiteboard interaction
  const canvasPos = (e: React.PointerEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!session) return
    const p = canvasPos(e)
    if (!p) return
    drawingRef.current = true
    currentStrokeRef.current = { id: Math.random().toString(36).slice(2), points: [p], color: brushColor, width: 3, mode: eraserMode ? 'erase' : 'draw' }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !currentStrokeRef.current || !session) return
    const p = canvasPos(e)
    if (!p) return
    currentStrokeRef.current.points.push(p)
    drawStroke(currentStrokeRef.current)
  }
  const onPointerUp = () => {
    if (currentStrokeRef.current && session) {
      socketRef.current?.emit('stroke', { sessionId: session.id, stroke: currentStrokeRef.current })
    }
    drawingRef.current = false
    currentStrokeRef.current = null
  }

  if (!liveSessionId) return null

  const teacher = participants.find((p) => p.role === 'TEACHER')
  const raisedHands = participants.filter((p) => p.handRaised)

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col" dir="rtl">
      {/* Header */}
      <div className="h-14 shrink-0 border-b border-white/10 flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${isLive ? 'bg-rose-600' : 'bg-white/10 text-white/70'}`}>
            <span className={`size-1.5 rounded-full bg-white ${isLive ? 'live-dot' : 'opacity-50'}`} />
            {isLive ? 'لایو' : 'آماده'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{session?.classGroup.course.title} — {session?.title}</p>
            <p className="text-[10px] text-white/50 truncate">{session?.classGroup.name} · {faDateShort(session?.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] flex items-center gap-1 ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={`size-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {connected ? 'متصل' : 'در حال اتصال...'}
          </span>
          <Button variant="ghost" size="icon" onClick={closeLive} className="text-white/70 hover:text-white hover:bg-white/10">
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 flex-col lg:flex-row">
        {/* Stage */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 grid place-items-center p-4 min-h-0">
            <div className="w-full max-w-4xl aspect-video rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 relative overflow-hidden flex flex-col items-center justify-center">
              {camOn ? (
                <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <div className="size-24 rounded-full bg-teal-500/20 border-2 border-teal-400/40 flex items-center justify-center text-3xl font-extrabold text-teal-300 mb-3">
                    {teacher?.name?.charAt(0) || user?.name?.charAt(0)}
                  </div>
                  <p className="font-bold">{teacher?.name || user?.name}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {session?.classGroup.teacher ? `استاد: ${session.classGroup.teacher.name}` : ROLE_LABELS[user?.role || '']}
                  </p>
                  <p className="text-[11px] text-white/30 mt-4 max-w-sm text-center leading-6">
                    {isLive ? 'جلسه در حال برگزاری است. صدا و تصویر استاد از طریق سرویس پخش زنده ارسال می‌شود.' : 'جلسه هنوز شروع نشده است.'}
                  </p>
                </>
              )}
              {isLive && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-rose-600 rounded-full px-3 py-1 text-[11px] font-bold">
                  <span className="size-1.5 rounded-full bg-white live-dot" />
                  LIVE
                </div>
              )}
              {raisedHands.length > 0 && (
                <div className="absolute top-3 left-3 bg-amber-500/90 rounded-full px-3 py-1 text-[11px] font-bold flex items-center gap-1">
                  <Hand className="size-3.5" />
                  {toFa(raisedHands.length)} دست بلند
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="shrink-0 border-t border-white/10 p-3 flex flex-wrap items-center justify-center gap-2">
            <Button variant="ghost" size="icon" onClick={camOn ? stopCam : startCam} className={`rounded-full size-11 ${camOn ? 'bg-white/10 text-white' : 'bg-white/5 text-white/60'}`} title={camOn ? 'خاموش کردن دوربین' : 'روشن کردن دوربین'}>
              {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleMic} className={`rounded-full size-11 ${micOn ? 'bg-white/10 text-white' : 'bg-white/5 text-white/60'}`} title="میکروفون">
              {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={toggleHand}
              className={`rounded-full size-11 ${handRaised ? 'bg-amber-500 text-white' : 'bg-white/5 text-white/60'}`}
              title="دست بلند کردن"
            >
              <Hand className="size-5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => setShowBoard(!showBoard)}
              className={`rounded-full size-11 ${showBoard ? 'bg-teal-600 text-white' : 'bg-white/5 text-white/60'}`}
              title="وایت‌برد"
            >
              <PenLine className="size-5" />
            </Button>
            {isTeacherHere && (
              <>
                <Button
                  onClick={toggleLive}
                  className={`rounded-full h-11 px-5 gap-2 font-bold ${isLive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  <Radio className="size-4" />
                  {isLive ? 'پایان پخش زنده' : 'شروع پخش زنده'}
                </Button>
                <Button onClick={endClass} variant="ghost" className="rounded-full h-11 px-4 gap-2 bg-white/5 text-rose-400 hover:bg-rose-600 hover:text-white">
                  <PhoneOff className="size-4" />
                  پایان کلاس
                </Button>
              </>
            )}
          </div>

          {/* Whiteboard */}
          {showBoard && (
            <div className="shrink-0 border-t border-white/10 p-3">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setBrushColor(c); setEraserMode(false) }}
                      className={`size-6 rounded-full border-2 ${brushColor === c && !eraserMode ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setEraserMode(!eraserMode)}
                    className={`gap-1 text-xs ${eraserMode ? 'bg-white/15 text-white' : 'text-white/60'}`}
                  >
                    <Eraser className="size-3.5" />پاک‌کن
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => { clearCanvas(); socketRef.current?.emit('clear-board', { sessionId: liveSessionId }) }}
                    className="gap-1 text-xs text-white/60"
                  >
                    پاک کردن همه
                  </Button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={960}
                  height={420}
                  className="w-full rounded-xl bg-white touch-none cursor-crosshair"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                />
              </div>
            </div>
          )}
        </div>

        {/* Side panel: chat + participants */}
        <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-s border-white/10 flex flex-col min-h-0 h-72 lg:h-auto">
          <div className="flex border-b border-white/10 shrink-0">
            {[
              { k: 'chat' as const, label: 'گفتگو', icon: MessageSquare },
              { k: 'people' as const, label: `حاضران (${toFa(participants.length)})`, icon: Users },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setChatTab(t.k)}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 ${chatTab === t.k ? 'text-teal-300 border-b-2 border-teal-400' : 'text-white/50'}`}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            ))}
          </div>

          {chatTab === 'chat' ? (
            <>
              <ScrollArea className="flex-1 p-3 min-h-0">
                <div className="space-y-2.5">
                  {messages.length === 0 && <p className="text-[11px] text-white/30 text-center py-8">اولین پیام را بفرستید</p>}
                  {messages.map((m) => (
                    <div key={m.id} className={m.type === 'SYSTEM' ? 'text-center' : ''}>
                      {m.type === 'SYSTEM' ? (
                        <p className="text-[10px] text-white/40 py-1">{m.content}</p>
                      ) : (
                        <div className={`rounded-xl px-3 py-2 max-w-[90%] ${m.userId === user?.id ? 'bg-teal-600/80 ml-auto' : m.role === 'TEACHER' ? 'bg-amber-600/25 border border-amber-500/30' : 'bg-white/8'}`}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {m.role === 'TEACHER' && <Crown className="size-3 text-amber-400" />}
                            <span className="text-[10px] font-bold opacity-80">{m.name}</span>
                            <span className="text-[9px] opacity-40 mr-auto">
                              {new Date(m.at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs leading-5">{m.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-white/10 shrink-0 flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  placeholder={chatMuted ? 'گفتگو توسط استاد غیرفعال شده' : 'پیام خود را بنویسید...'}
                  disabled={chatMuted}
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/30 text-xs h-10"
                />
                <Button size="icon" onClick={sendChat} disabled={chatMuted || !chatInput.trim()} className="bg-teal-600 hover:bg-teal-700 size-10 shrink-0">
                  <Send className="size-4" />
                </Button>
              </div>
            </>
          ) : (
            <ScrollArea className="flex-1 p-3 min-h-0">
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.socketId} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
                    <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${p.role === 'TEACHER' ? 'bg-amber-500/90 text-white' : 'bg-teal-600/80 text-white'}`}>
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{p.name} {p.userId === user?.id && '(شما)'}</p>
                      <p className="text-[9px] text-white/40">{ROLE_LABELS[p.role] || p.role}</p>
                    </div>
                    {p.handRaised && <Hand className="size-4 text-amber-400" />}
                    {p.role === 'TEACHER' && <Crown className="size-4 text-amber-400" />}
                  </div>
                ))}
                {participants.length === 0 && <p className="text-[11px] text-white/30 text-center py-8">هنوز کسی وارد نشده</p>}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  )
}
