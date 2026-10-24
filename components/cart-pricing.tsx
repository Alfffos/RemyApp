'use client'

import { useState } from 'react'
import { MAX_CART_ITEMS } from '@/lib/cart/cart'
import type { CartItem, CartQuote, ItemQuote } from '@/lib/cart/pricing'
import type { Store } from '@/lib/scraper/stores'

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
const statusLabel: Record<ItemQuote['status'], string> = {
  found: '', not_found: 'Sin coincidencias', error: 'No se pudo leer', skipped: 'Sin tiempo',
}

export function CartPricing({ initialItems, stores }: { initialItems: CartItem[]; stores: Store[] }) {
  const [items, setItems] = useState<CartItem[]>(initialItems)
  const [newItem, setNewItem] = useState('')
  const [quote, setQuote] = useState<CartQuote | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function addItem() {
    const name = newItem.trim()
    if (name.length < 2 || items.length >= MAX_CART_ITEMS) return
    setItems(prev => [...prev, { name, quantity: 1 }])
    setNewItem('')
  }
  function setQuantity(index: number, quantity: number) {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, quantity: Math.min(50, Math.max(1, quantity || 1)) } : item)))
  }

  async function requestPrices() {
    setLoading(true); setError(''); setQuote(null)
    try {
      const response = await fetch('/api/cart/price', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, stores }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'No se pudieron consultar los precios.')
      setQuote(data as CartQuote)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return <section className="cart-panel" aria-labelledby="cart-title">
    <div className="summary-heading"><h3 id="cart-title">Tu carrito</h3><span className="cart-count">{items.length} / {MAX_CART_ITEMS}</span></div>
    <p className="field-hint">Carrito inicial armado con tu perfil. Cuando el generador de dietas esté conectado, se completará con los ingredientes de tu plan.</p>

    <ul className="cart-list">
      {items.map((item, index) => <li key={item.name + index}>
        <span>{item.name}</span>
        <label className="sr-only" htmlFor={'qty-' + index}>Cantidad de {item.name}</label>
        <input id={'qty-' + index} type="number" min={1} max={50} value={item.quantity} onChange={e => setQuantity(index, Number(e.target.value))} disabled={loading} />
        <button type="button" className="text-button" onClick={() => setItems(prev => prev.filter((_, i) => i !== index))} disabled={loading} aria-label={'Quitar ' + item.name}>Quitar</button>
      </li>)}
    </ul>

    <div className="cart-add">
      <label className="sr-only" htmlFor="new-item">Agregar producto</label>
      <input id="new-item" value={newItem} maxLength={80} placeholder="Agregar producto, ej. Queso cremoso" disabled={loading || items.length >= MAX_CART_ITEMS}
        onChange={e => setNewItem(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { if (e.nativeEvent.isComposing || e.keyCode === 229) return; e.preventDefault(); addItem() } }} />
      <button type="button" className="back-button" onClick={addItem} disabled={loading || newItem.trim().length < 2}>Agregar</button>
    </div>

    <button type="button" className="primary-button cart-submit" onClick={requestPrices} disabled={loading || items.length === 0}>
      {loading ? 'Buscando precios…' : 'Comparar precios en supermercados'}<span aria-hidden="true">→</span>
    </button>
    <div aria-live="polite">
      {loading && <p className="field-hint">Recorremos cada supermercado y buscamos cada producto. Puede tardar unos minutos.</p>}
      {error && <div className="notice error-notice" role="alert">{error}</div>}
      {quote && <QuoteResult quote={quote} />}
    </div>
  </section>
}

function QuoteResult({ quote }: { quote: CartQuote }) {
  const cheapest = quote.stores.find(store => store.storeId === quote.cheapestStoreId)
  return <div className="quote">
    <div className="notice success-notice">
      {cheapest
        ? <p><strong>Conviene {cheapest.storeName}: {currency.format(cheapest.total)}</strong>{cheapest.missing > 0 && ` (faltan ${cheapest.missing} productos)`}</p>
        : <p><strong>No encontramos precios suficientes para comparar.</strong></p>}
      {quote.mixed.total > 0 && <p>Combinando tiendas: {currency.format(quote.mixed.total)}{quote.mixed.missing > 0 && ` · ${quote.mixed.missing} sin precio`}</p>}
    </div>
    {quote.stores.map(store => <section key={store.storeId} className="summary-section">
      <div className="summary-heading"><h3>{store.storeName}</h3><strong className="quote-total">{currency.format(store.total)}</strong></div>
      {store.error && <p className="field-error">{store.error}</p>}
      <dl>{store.items.map((item, i) => <div key={item.item + i}>
        <dt>{item.quantity} × {item.item}</dt>
        <dd>{item.status === 'found' && item.product
          ? <>{item.product.name} · {currency.format(item.subtotal ?? 0)}</>
          : <span className="muted-text">{statusLabel[item.status]}</span>}</dd>
      </div>)}</dl>
    </section>)}
  </div>
}
