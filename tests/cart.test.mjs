import assert from 'node:assert/strict'
import test from 'node:test'
import { parsePrice, pickBestMatch, quoteItem, summarizeCart, totalStore } from '../lib/cart/pricing.ts'

test('parsePrice handles AR and plain formats', () => {
  assert.equal(parsePrice('$ 1.234,56'), 1234.56)
  assert.equal(parsePrice('$1.234'), 1234)
  assert.equal(parsePrice('1234.5'), 1234.5)
  assert.equal(parsePrice('$\u00a02.500,00 c/u'), 2500)
  assert.equal(parsePrice('Sin stock'), null)
})

test('pickBestMatch prefers name overlap, then the lowest price', () => {
  const products = [
    { name: 'Chocolatada Cindor', price: 900, priceText: '$900' },
    { name: 'Leche Entera La Serenísima 1L', price: 1500, priceText: '$1.500' },
    { name: 'Leche Descremada Tregar 1L', price: 1300, priceText: '$1.300' },
  ]
  assert.equal(pickBestMatch('Leche', products)?.price, 1300)
  assert.equal(pickBestMatch('Leche entera', products)?.name, 'Leche Entera La Serenísima 1L')
  assert.equal(pickBestMatch('Papel higiénico', products), null)
})

test('summarizeCart ranks stores by coverage and total, and builds a mixed cart', () => {
  const cart = [{ name: 'Leche', quantity: 2 }, { name: 'Arroz', quantity: 1 }]
  const a = [quoteItem(cart[0], [{ name: 'Leche', price: 1000, priceText: '' }]), quoteItem(cart[1], [{ name: 'Arroz largo', price: 800, priceText: '' }])]
  const b = [quoteItem(cart[0], [{ name: 'Leche', price: 900, priceText: '' }]), quoteItem(cart[1], [])]
  const quote = summarizeCart(cart, [
    { storeId: 'a', storeName: 'A', url: '', items: a, ...totalStore(a) },
    { storeId: 'b', storeName: 'B', url: '', items: b, ...totalStore(b) },
  ])
  assert.equal(quote.stores[0].total, 2800)
  assert.equal(quote.cheapestStoreId, 'a')
  assert.equal(quote.mixed.total, 2600)
  assert.equal(quote.mixed.items[0].storeId, 'b')
  assert.equal(quote.mixed.missing, 0)
})
