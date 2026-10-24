'use client'

import { useState } from 'react'
import { MAX_STORES, normalizeStoreUrl, storeSchema, type Store } from '@/lib/scraper/stores'

interface Props {
  supermarkets: Store[]
  selected: string[]
  error?: string
  onChange: (supermarkets: Store[], selected: string[]) => void
}

export function SupermarketStep({ supermarkets, selected, error, onChange }: Props) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [formErrors, setFormErrors] = useState<{ name?: string; url?: string }>({})
  const atLimit = selected.length >= MAX_STORES

  function toggle(id: string) {
    if (selected.includes(id)) onChange(supermarkets, selected.filter(value => value !== id))
    else if (!atLimit) onChange(supermarkets, [...selected, id])
  }

  function add() {
    const candidate = { id: 'custom-' + Date.now().toString(36), name: name.trim(), url: url.trim() ? normalizeStoreUrl(url) : '' }
    const result = storeSchema.safeParse(candidate)
    const nextErrors: { name?: string; url?: string } = {}
    if (!result.success) for (const issue of result.error.issues) nextErrors[issue.path[0] as 'name' | 'url'] ??= issue.message
    const host = result.success ? new URL(result.data.url).host : ''
    if (host && supermarkets.some(store => new URL(store.url).host === host)) nextErrors.url = 'Ese supermercado ya está en la lista.'
    if (atLimit) nextErrors.name = `Podés elegir hasta ${MAX_STORES} supermercados.`
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length || !result.success) return
    onChange([...supermarkets, result.data], [...selected, result.data.id])
    setName(''); setUrl('')
  }

  function remove(id: string) {
    onChange(supermarkets.filter(store => store.id !== id), selected.filter(value => value !== id))
  }

  return <>
    <fieldset className="choice-field" aria-describedby={error ? 'selectedSupermarkets-error' : 'stores-hint'}>
      <legend>¿En qué supermercados podés comprar?</legend>
      <p id="stores-hint" className="field-hint">Elegí todos los que tengas a mano. Compararemos el precio de tu carrito en cada uno.</p>
      <div className="store-list">
        {supermarkets.map(store => {
          const isSelected = selected.includes(store.id)
          const custom = store.id.startsWith('custom-')
          return <div key={store.id} className={'choice store-choice ' + (isSelected ? 'selected' : '')}>
            <label className="store-label">
              <input type="checkbox" checked={isSelected} disabled={!isSelected && atLimit} onChange={() => toggle(store.id)} />
              <span className="store-check" aria-hidden="true">{isSelected ? '✓' : ''}</span>
              <span><strong>{store.name}</strong><small>{new URL(store.url).host.replace(/^www\./, '')}</small></span>
            </label>
            {custom && <button type="button" className="text-button" onClick={() => remove(store.id)} aria-label={'Quitar ' + store.name}>Quitar</button>}
          </div>
        })}
      </div>
      {error && <p className="field-error" id="selectedSupermarkets-error">{error}</p>}
    </fieldset>

    <section className="store-add" aria-labelledby="store-add-title">
      <h3 id="store-add-title">Agregar otro supermercado</h3>
      <div className="gentle-note"><span aria-hidden="true">i</span><p>El supermercado tiene que tener una página web con un <strong>buscador de productos</strong>. Ingresá la URL de esa página: ahí vamos a buscar cada producto de tu carrito.</p></div>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="store-name">Nombre del supermercado</label>
          <input id="store-name" value={name} maxLength={60} placeholder="Ej. Carrefour" aria-invalid={!!formErrors.name} aria-describedby={formErrors.name ? 'store-name-error' : undefined}
            onChange={e => { setName(e.target.value); setFormErrors(prev => ({ ...prev, name: undefined })) }} />
          {formErrors.name && <p className="field-error" id="store-name-error">{formErrors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="store-url">Url del supermercado</label>
          <input id="store-url" type="url" inputMode="url" value={url} maxLength={300} placeholder="https://www.carrefour.com.ar" aria-invalid={!!formErrors.url} aria-describedby={formErrors.url ? 'store-url-error' : undefined}
            onChange={e => { setUrl(e.target.value); setFormErrors(prev => ({ ...prev, url: undefined })) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (e.nativeEvent.isComposing || e.keyCode === 229) return; add() } }} />
          {formErrors.url && <p className="field-error" id="store-url-error">{formErrors.url}</p>}
        </div>
      </div>
      <button type="button" className="back-button store-add-button" onClick={add} disabled={!name.trim() || !url.trim()}>+ Agregar supermercado</button>
    </section>
  </>
}
