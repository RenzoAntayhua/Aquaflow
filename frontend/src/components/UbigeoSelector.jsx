import { useEffect, useMemo, useRef, useState } from 'react'
import { getDepartamentos, getProvincias, getDistritos } from '../lib/api'

function Combobox({
  items,
  getId = (x) => x.Id ?? x.id,
  getLabel = (x) => x.Nombre ?? x.nombre ?? '',
  valueId,
  onChange,
  placeholder = 'Escribe para buscar…',
  disabled = false,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef(null)

  const selected = useMemo(() => items.find(i => String(getId(i)) === String(valueId)) || null, [items, valueId])

  useEffect(() => {
    if (selected) {
      setQuery(getLabel(selected))
    }
    // Nota: no limpiamos el query cuando selected es null para no borrar lo que el usuario tipeó
  }, [selected])

  const filtered = useMemo(() => {
    const q = (query || '').trim().toUpperCase()
    const list = q ? items.filter(i => getLabel(i).toUpperCase().includes(q)) : items
    return list.slice(0, 200) // limitar resultados
  }, [items, query])

  function handleSelect(item) {
    onChange?.(getId(item))
    setQuery(getLabel(item))
    setOpen(false)
  }

  function onKeyDown(e) {
    if (!open && ['ArrowDown','ArrowUp'].includes(e.key)) { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) handleSelect(filtered[active]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  useEffect(() => {
    function onClickOutside(ev) {
      if (ref.current && !ref.current.contains(ev.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border px-3 text-sm"
        disabled={disabled}
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-white shadow">
          {filtered.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">Sin coincidencias</div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={getId(item)}
                className={`px-3 py-2 text-sm cursor-pointer ${idx === active ? 'bg-slate-100' : ''}`}
                onMouseEnter={() => setActive(idx)}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(item) }}
              >
                {getLabel(item)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function UbigeoSelector({ onChange, className = '' }) {
  const [departamentos, setDepartamentos] = useState([])
  const [provincias, setProvincias] = useState([])
  const [distritos, setDistritos] = useState([])

  const [depId, setDepId] = useState('')
  const [provId, setProvId] = useState('')
  const [distId, setDistId] = useState('')

  useEffect(() => {
    let alive = true
    getDepartamentos().then((res) => {
      if (!alive) return
      setDepartamentos(res)
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!depId) { setProvincias([]); setProvId(''); setDistritos([]); setDistId(''); return }
    let alive = true
    getProvincias({ departamentoId: Number(depId) }).then((res) => {
      if (!alive) return
      setProvincias(res)
    }).catch(() => {})
    return () => { alive = false }
  }, [depId])

  useEffect(() => {
    if (!provId) { setDistritos([]); setDistId(''); return }
    let alive = true
    getDistritos({ provinciaId: Number(provId) }).then((res) => {
      if (!alive) return
      setDistritos(res)
    }).catch(() => {})
    return () => { alive = false }
  }, [provId])

  useEffect(() => {
    const departamento = departamentos.find(d => String(d.Id || d.id) === String(depId)) || null
    const provincia = provincias.find(p => String(p.Id || p.id) === String(provId)) || null
    const distrito = distritos.find(d => String(d.Id || d.id) === String(distId)) || null
    onChange?.({ departamento, provincia, distrito })
  }, [depId, provId, distId, departamentos, provincias, distritos, onChange])

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-1">
        <label className="text-sm">Departamento</label>
        <Combobox
          items={departamentos}
          valueId={depId}
          onChange={(id) => setDepId(id)}
          placeholder="Escribe el departamento"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm">Provincia</label>
        <Combobox
          items={provincias}
          valueId={provId}
          onChange={(id) => setProvId(id)}
          placeholder="Escribe la provincia"
          disabled={!depId}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm">Distrito</label>
        <Combobox
          items={distritos}
          valueId={distId}
          onChange={(id) => setDistId(id)}
          placeholder="Escribe el distrito"
          disabled={!provId}
        />
      </div>
    </div>
  )
}