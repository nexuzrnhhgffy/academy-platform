// Persian formatting helpers (client-safe)

export function toFa(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const v = Math.round(n)
  const grouped = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${toFa(grouped)} تومان`
}

export function moneyShort(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${toFa((n / 1_000_000_000).toFixed(1))} میلیارد`
  if (Math.abs(n) >= 1_000_000) return `${toFa((n / 1_000_000).toFixed(1))} میلیون`
  if (Math.abs(n) >= 1000) return `${toFa(Math.round(n / 1000))} هزار`
  return toFa(n)
}

export function faDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(d))
  } catch {
    return '—'
  }
}

export function faDateShort(d: string | Date | null | undefined): string {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(new Date(d))
  } catch {
    return '—'
  }
}

export function faDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(d))
  } catch {
    return '—'
  }
}

export function faMonth(d: string | Date): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(new Date(d))
  } catch {
    return '—'
  }
}

export function timeAgo(d: string | Date): string {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'همین حالا'
  if (mins < 60) return `${toFa(mins)} دقیقه پیش`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${toFa(hours)} ساعت پیش`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${toFa(days)} روز پیش`
  return faDate(d)
}

export function persianWeekday(d: string | Date): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(new Date(d))
  } catch {
    return '—'
  }
}

// Convert Jalali label like "شنبه، ۱۲ مهر" — we keep ISO internally
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
