import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyProfile, reviewReasons, toDietProfile, validateStep } from '../lib/profile/profile.ts'

function valid() {
  return { ...emptyProfile(), age: '30', height: '170', weight: '72.5', sex: 'female',
    dailyActivity: 'seated', exerciseDays: '0', goal: 'maintain', diet: 'omnivore',
    pregnancy: 'no', breastfeeding: 'no', medicalCondition: 'no', selectedSupermarkets: ['coto'] }
}
test('a complete adult profile passes every step without exercise details', () => {
  const profile = valid()
  for (let i = 0; i < 5; i++) assert.deepEqual(validateStep(i, profile), {})
  assert.deepEqual(reviewReasons(profile), [])
  assert.equal(toDietProfile(profile).weightKg, 72.5)
})
test('missing, invalid and non-integral values are rejected', () => {
  assert.ok(validateStep(0, { ...valid(), age: '' }).age)
  assert.ok(validateStep(0, { ...valid(), age: '30.5' }).age)
  assert.ok(validateStep(0, { ...valid(), weight: '-1' }).weight)
  assert.ok(validateStep(1, { ...valid(), exerciseDays: '8' }).exerciseDays)
})
test('exercise details are required only when exercising', () => {
  const profile = { ...valid(), exerciseDays: '3' }
  assert.ok(validateStep(1, profile).exerciseMinutes)
  assert.ok(validateStep(1, profile).exerciseIntensity)
  assert.deepEqual(validateStep(1, { ...profile, exerciseMinutes: '45', exerciseIntensity: 'moderate' }), {})
})
test('target follows the goal direction and muscle gain needs an answer', () => {
  assert.ok(validateStep(2, { ...valid(), goal: 'lose', targetWeight: '80' }).targetWeight)
  assert.ok(validateStep(2, { ...valid(), goal: 'gain', targetWeight: '60' }).targetWeight)
  assert.ok(validateStep(2, { ...valid(), goal: 'gain' }).muscleGain)
  assert.deepEqual(validateStep(2, { ...valid(), goal: 'lose', targetWeight: '' }), {})
})
test('food choices enforce meals, days, allergy details and valid times', () => {
  assert.ok(validateStep(3, { ...valid(), meals: [] }).meals)
  assert.ok(validateStep(3, { ...valid(), days: [] }).days)
  assert.ok(validateStep(3, { ...valid(), allergies: ['Otra'] }).otherAllergy)
  assert.ok(validateStep(3, { ...valid(), times: { Cena: '27:00' } }).times)
})
test('at least one supermarket is required and selected stores reach the contract', () => {
  assert.ok(validateStep(4, { ...valid(), selectedSupermarkets: [] }).selectedSupermarkets)
  assert.deepEqual(toDietProfile(valid()).supermarkets.map(s => s.id), ['coto'])
})
test('review cases are identified', () => {
  for (const key of ['pregnancy', 'breastfeeding', 'medicalCondition'])
    assert.equal(reviewReasons({ ...valid(), [key]: 'yes' }).length, 1)
  assert.equal(reviewReasons({ ...valid(), age: '17' }).length, 1)
  assert.equal(reviewReasons({ ...valid(), age: '18' }).length, 0)
})
test('inactive conditional answers are excluded from the planner contract', () => {
  const profile = toDietProfile({ ...valid(), exerciseMinutes: '45', exerciseIntensity: 'intense',
    muscleGain: 'yes', targetWeight: '65', otherAllergy: 'Apio', times: { Cena: '21:00', Colación: '11:00' } })
  assert.equal(profile.activity.exerciseMinutes, 0)
  assert.equal(profile.activity.exerciseIntensity, null)
  assert.equal(profile.objective.targetWeightKg, null)
  assert.equal(profile.objective.muscleGain, false)
  assert.equal(profile.food.otherAllergy, '')
  assert.equal(profile.schedule.meals.find(m => m.name === 'Cena').time, '21:00')
  assert.equal(profile.schedule.meals.some(m => m.name === 'Colación'), false)
})
