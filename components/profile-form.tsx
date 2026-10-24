'use client'

import { useRef, useState, type ReactNode } from 'react'
import { CartPricing } from '@/components/cart-pricing'
import { SupermarketStep } from '@/components/supermarket-step'
import { starterCart } from '@/lib/cart/cart'
import { allergies, emptyProfile, meals, reviewReasons, selectedStores, SUMMARY_STEP, toDietProfile, validateStep, weekdays, type FieldErrors, type ProfileDraft } from '@/lib/profile/profile'

const steps = [
  { title: 'Sobre vos', description: 'Empecemos por lo esencial para conocer tus necesidades.', short: 'Datos personales' },
  { title: 'Tu ritmo diario', description: 'Tu movimiento cotidiano también cuenta, además del ejercicio.', short: 'Actividad' },
  { title: '¿Qué querés lograr?', description: 'Elegí el objetivo que mejor representa este momento.', short: 'Objetivo' },
  { title: 'A tu gusto y a tu tiempo', description: 'Organicemos un plan que encaje con tu manera de comer.', short: 'Alimentación' },
  { title: '¿Dónde hacés las compras?', description: 'Elegí los supermercados a los que tenés acceso para comparar precios.', short: 'Supermercados' },
  { title: 'Todo empieza por vos', description: 'Revisá tus respuestas. Podés editar cualquier sección antes de continuar.', short: 'Resumen' },
]
const labels: Record<string, string> = {
  female: 'Femenino', male: 'Masculino', seated: 'Principalmente sentado/a', moving: 'Movimiento frecuente',
  physical: 'Trabajo físicamente exigente', light: 'Suave', moderate: 'Moderado', intense: 'Intenso',
  lose: 'Perder peso', maintain: 'Mantener mi peso', gain: 'Ganar peso', omnivore: 'Sin restricción',
  vegetarian: 'Vegetariana', vegan: 'Vegana', week: 'Cada semana', month: 'Cada mes', yes: 'Sí', no: 'No',
}

function Field({ name, label, hint, error, children }: { name: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return <div className="field">
    <label htmlFor={name}>{label}</label>
    {hint && <p id={name + '-hint'} className="field-hint">{hint}</p>}
    {children}
    {error && <p className="field-error" id={name + '-error'}>{error}</p>}
  </div>
}

export function ProfileForm() {
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfile)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [finished, setFinished] = useState(false)
  const [editing, setEditing] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const reasons = reviewReasons(draft)

  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
    setFinished(false)
  }
  function move(next: number) {
    setStep(next); setErrors({}); setFinished(false)
    requestAnimationFrame(() => { titleRef.current?.focus(); titleRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }) })
  }
  function edit(next: number) { setEditing(step === SUMMARY_STEP || editing); move(next) }
  function advance() {
    const nextErrors = validateStep(step, draft)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      requestAnimationFrame(() => errorRef.current?.focus())
      return
    }
    const next = editing ? SUMMARY_STEP : step + 1
    setEditing(false); move(next)
  }
  function finish() {
    for (let i = 0; i < SUMMARY_STEP; i++) {
      const nextErrors = validateStep(i, draft)
      if (Object.keys(nextErrors).length) {
        setEditing(true); move(i); setErrors(nextErrors)
        requestAnimationFrame(() => errorRef.current?.focus())
        return
      }
    }
    if (reasons.length) return
    setFinished(true)
  }
  function inputProps(name: keyof ProfileDraft, hasHint = true) {
    return {
      id: name, name, 'aria-invalid': !!errors[name],
      'aria-describedby': [hasHint ? name + '-hint' : '', errors[name] ? name + '-error' : ''].filter(Boolean).join(' ') || undefined,
    }
  }
  function numberField(name: 'age' | 'height' | 'weight' | 'exerciseMinutes' | 'targetWeight', label: string, min: number, max: number, unit: string, optional = false) {
    return <Field name={name} label={label} hint={optional ? 'Opcional · ' + unit : unit} error={errors[name]}>
      <div className="input-unit"><input {...inputProps(name)} type="number" min={min} max={max} step={['age', 'exerciseMinutes'].includes(name) ? '1' : '0.1'} inputMode={['age', 'exerciseMinutes'].includes(name) ? 'numeric' : 'decimal'} required={!optional} value={draft[name]} onChange={e => update(name, e.target.value)} placeholder={name === 'height' ? 'Ej. 170' : name === 'weight' ? 'Ej. 72,5' : ''} /><span aria-hidden="true">{unit}</span></div>
    </Field>
  }
  function choices(name: 'sex' | 'dailyActivity' | 'exerciseIntensity' | 'goal' | 'muscleGain' | 'diet' | 'duration' | 'pregnancy' | 'breastfeeding' | 'medicalCondition', legend: string, options: { value: string; label: string; hint?: string; icon?: string }[], hint?: string) {
    return <fieldset className="choice-field" aria-describedby={errors[name] ? name + '-error' : undefined}>
      <legend>{legend}</legend>
      {hint && <p className="field-hint">{hint}</p>}
      <div className={'choices ' + (options.length === 2 ? 'two' : '')}>
        {options.map(option => <label key={option.value} className={'choice ' + (draft[name] === option.value ? 'selected' : '')}>
          <input type="radio" name={name} value={option.value} checked={draft[name] === option.value} onChange={() => {
            update(name, option.value)
            if (name === 'goal') { update('targetWeight', ''); update('muscleGain', '') }
          }} />
          {option.icon && <span className="choice-icon" aria-hidden="true">{option.icon}</span>}
          <span><strong>{option.label}</strong>{option.hint && <small>{option.hint}</small>}</span>
          <span className="radio-dot" aria-hidden="true" />
        </label>)}
      </div>
      {errors[name] && <p className="field-error" id={name + '-error'}>{errors[name]}</p>}
    </fieldset>
  }
  function toggle(name: 'allergies' | 'meals' | 'days', value: string) {
    update(name, draft[name].includes(value) ? draft[name].filter(v => v !== value) : [...draft[name], value])
  }
  function chips(name: 'allergies' | 'meals' | 'days', legend: string, values: readonly string[], hint?: string) {
    return <fieldset className="choice-field" aria-describedby={errors[name] ? name + '-error' : undefined}><legend>{legend}</legend>{hint && <p className="field-hint">{hint}</p>}
      <div className="chips">{values.map(value => <label className={'chip ' + (draft[name].includes(value) ? 'selected' : '')} key={value}>
        <input type="checkbox" checked={draft[name].includes(value)} onChange={() => toggle(name, value)} /><span>{value}</span>
      </label>)}</div>
      {errors[name] && <p className="field-error" id={name + '-error'}>{errors[name]}</p>}
    </fieldset>
  }
  function summary(index: number, items: [string, string][]) {
    return <section className="summary-section"><div className="summary-heading"><h3>{steps[index].short}</h3><button type="button" className="text-button" onClick={() => edit(index)} aria-label={'Editar ' + steps[index].short.toLowerCase()}>Editar <span aria-hidden="true">↗</span></button></div>
      <dl>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
  }

  return <div className="remy-shell">
    <header className="topbar"><a href="/" className="brand" aria-label="Remy, inicio"><span className="brand-symbol" aria-hidden="true">r<span>•</span></span>remy<span className="brand-period">.</span></a><span className="session-badge"><span /> Sin cuenta, a tu ritmo</span></header>
    <main className="workspace">
      <aside className="intro">
        <span className="eyebrow"><span /> COMER BIEN, VIVIR MEJOR</span>
        <h1>Tu alimentación.<br /> Tu ritmo.<br /> <em>Tu plan.</em></h1>
        <p>Un plan que empieza por conocerte. Contanos un poco de vos y de lo que querés lograr.</p>
        <nav aria-label="Pasos del formulario"><ol className="step-list">
          {steps.map((item, index) => <li key={item.short} className={index === step ? 'active' : index < step ? 'complete' : ''}>
            <button type="button" disabled={index >= step} onClick={() => edit(index)} aria-current={index === step ? 'step' : undefined} aria-label={'Paso ' + (index + 1) + ': ' + item.short}>
              <span className="step-number">{index < step ? '✓' : String(index + 1).padStart(2, '0')}</span><span>{item.short}</span>{index === step && <span className="step-arrow" aria-hidden="true">↗</span>}
            </button>
          </li>)}
        </ol></nav>
        <div className="privacy-note"><span aria-hidden="true">◈</span><p><strong>Tu información es tuya.</strong><br />Se usa durante esta sesión. No se guarda en una base de datos y se borra al recargar.</p></div>
      </aside>
      <section className="form-card" aria-labelledby="step-title">
        <div className="card-topline"><span>TU PERFIL ALIMENTARIO</span><span>{String(step + 1).padStart(2, '0')} <span className="muted">/ {String(steps.length).padStart(2, '0')}</span></span></div>
        <div className="progress-track" role="progressbar" aria-label="Progreso del formulario" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}><span style={{ width: ((step + 1) / steps.length * 100) + '%' }} /></div>
        <div className="card-body">
          <div className="step-heading"><span className="section-icon" aria-hidden="true">{['◎', '↗', '⚑', '◒', '⌂', '✓'][step]}</span><h2 id="step-title" tabIndex={-1} ref={titleRef}>{steps[step].title}</h2><p>{steps[step].description}</p></div>
          <form noValidate onSubmit={e => { e.preventDefault(); if (step === SUMMARY_STEP) finish(); else advance() }}>
            {Object.keys(errors).length > 0 && <div className="notice error-notice" tabIndex={-1} ref={errorRef} role="alert"><strong>Revisá estos datos para continuar.</strong><ul>{Object.entries(errors).map(([key, value]) => <li key={key}>{value}</li>)}</ul></div>}
            <div className="step-content">
            {step === 0 && <>
              {numberField('age', '¿Cuántos años tenés?', 1, 120, 'años')}
              <div className="field-grid">{numberField('height', 'Altura', 80, 250, 'cm')}{numberField('weight', 'Peso actual', 20, 400, 'kg')}</div>
              {choices('sex', 'Sexo para el cálculo metabólico', [{ value: 'female', label: 'Femenino' }, { value: 'male', label: 'Masculino' }], 'Este dato se utiliza en la fórmula para estimar tu gasto energético.')}
              <div className="gentle-note"><span aria-hidden="true">i</span><p>No necesitás saber tus calorías. Más adelante las estimaremos a partir de tus datos y tu actividad habitual.</p></div>
            </>}
            {step === 1 && <>
              {choices('dailyActivity', '¿Cómo es un día habitual para vos?', [
                { value: 'seated', label: 'Principalmente sentado/a', hint: 'Trabajo de escritorio o estudio, con poco movimiento.' },
                { value: 'moving', label: 'Me muevo con frecuencia', hint: 'Paso bastante tiempo de pie o caminando.' },
                { value: 'physical', label: 'Trabajo físicamente exigente', hint: 'Cargo peso o realizo esfuerzo físico durante el día.' },
              ])}
              <Field name="exerciseDays" label="¿Cuántos días por semana hacés ejercicio?" hint="Elegí 0 si no hacés ejercicio." error={errors.exerciseDays}>
                <select {...inputProps('exerciseDays')} value={draft.exerciseDays} onChange={e => update('exerciseDays', e.target.value)}><option value="">Seleccioná una frecuencia</option>{Array.from({ length: 8 }, (_, i) => <option key={i} value={String(i)}>{i === 0 ? 'No hago ejercicio' : i + (i === 1 ? ' día' : ' días')}</option>)}</select>
              </Field>
              {Number(draft.exerciseDays) > 0 && <>
                {numberField('exerciseMinutes', 'Duración habitual de cada sesión', 5, 360, 'min')}
                {choices('exerciseIntensity', 'Intensidad aproximada', [
                  { value: 'light', label: 'Suave', hint: 'Podés conversar sin dificultad.' },
                  { value: 'moderate', label: 'Moderada', hint: 'Respirás más rápido, pero podés conversar.' },
                  { value: 'intense', label: 'Intensa', hint: 'Te cuesta decir más que unas pocas palabras.' },
                ])}
              </>}
            </>}
            {step === 2 && <>
              {choices('goal', 'Mi objetivo es…', [
                { value: 'lose', label: 'Perder peso', hint: 'Orientar el plan hacia una reducción de peso.', icon: '↘' },
                { value: 'maintain', label: 'Mantener mi peso', hint: 'Organizar mis comidas y sostener mi peso actual.', icon: '↔' },
                { value: 'gain', label: 'Ganar peso', hint: 'Orientar el plan hacia un aumento de peso.', icon: '↗' },
              ])}
              {draft.goal === 'gain' && choices('muscleGain', '¿Buscás aumentar masa muscular?', [{ value: 'yes', label: 'Sí' }, { value: 'no', label: 'No' }])}
              {draft.goal && draft.goal !== 'maintain' && numberField('targetWeight', 'Peso objetivo', 20, 400, 'kg', true)}
              <div className="gentle-note"><span aria-hidden="true">i</span><p>No hace falta fijar una fecha límite. El peso objetivo es una referencia, no una promesa de resultados.</p></div>
            </>}
            {step === 3 && <>
              {choices('diet', '¿Cómo te alimentás?', [{ value: 'omnivore', label: 'Sin restricción' }, { value: 'vegetarian', label: 'Vegetariana' }, { value: 'vegan', label: 'Vegana' }])}
              {chips('allergies', 'Alergias e intolerancias', allergies, 'Seleccioná todas las que correspondan. Si no tenés, dejá las opciones sin marcar.')}
              {draft.allergies.includes('Otra') && <Field name="otherAllergy" label="¿Qué otra alergia o intolerancia tenés?" error={errors.otherAllergy}><input {...inputProps('otherAllergy', false)} value={draft.otherAllergy} maxLength={300} onChange={e => update('otherAllergy', e.target.value)} /></Field>}
              <Field name="excludedFoods" label="Alimentos que preferís evitar" hint="Opcional. Separalos con comas; por ejemplo: brócoli, aceitunas." error={errors.excludedFoods}><textarea {...inputProps('excludedFoods')} rows={2} maxLength={1000} value={draft.excludedFoods} onChange={e => update('excludedFoods', e.target.value)} /></Field>
              {chips('meals', '¿Qué comidas incluimos?', meals)}
              {chips('days', 'Días que querés planificar', weekdays, 'Se repetirán en cada semana del período elegido.')}
              {choices('duration', '¿Cada cuánto hacés las compras?', [{ value: 'week', label: 'Cada semana' }, { value: 'month', label: 'Cada mes' }])}
              <Field name="cookingTime" label="Tiempo máximo para preparar una comida" hint="Opcional"><select {...inputProps('cookingTime')} value={draft.cookingTime} onChange={e => update('cookingTime', e.target.value)}><option value="">Sin preferencia</option><option value="15">Hasta 15 minutos</option><option value="30">Hasta 30 minutos</option><option value="60">Hasta 60 minutos</option></select></Field>
            </>}
            {step === 4 && <SupermarketStep supermarkets={draft.supermarkets} selected={draft.selectedSupermarkets} error={errors.selectedSupermarkets}
              onChange={(supermarkets, selected) => { update('supermarkets', supermarkets); update('selectedSupermarkets', selected) }} />}
            {step === SUMMARY_STEP && <>
              {summary(0, [['Edad', draft.age + ' años'], ['Altura', draft.height + ' cm'], ['Peso actual', draft.weight + ' kg'], ['Sexo para el cálculo', labels[draft.sex]]])}
              {summary(1, [['Actividad cotidiana', labels[draft.dailyActivity]], ['Ejercicio', Number(draft.exerciseDays) > 0 ? draft.exerciseDays + ' días/semana · ' + draft.exerciseMinutes + ' min · ' + labels[draft.exerciseIntensity] : 'Sin ejercicio habitual']])}
              {summary(2, [['Objetivo', labels[draft.goal]], ...(draft.goal === 'gain' ? [['Aumentar masa muscular', labels[draft.muscleGain]] as [string, string]] : []), ...(draft.goal !== 'maintain' && draft.targetWeight ? [['Peso objetivo', draft.targetWeight + ' kg'] as [string, string]] : [])])}
              {summary(3, [['Alimentación', labels[draft.diet]], ['Alergias e intolerancias', draft.allergies.map(a => a === 'Otra' ? draft.otherAllergy : a).join(', ') || 'Ninguna informada'], ['Alimentos a evitar', draft.excludedFoods || 'Sin preferencias adicionales'], ['Comidas', meals.filter(m => draft.meals.includes(m)).join(' / ')], ['Días', weekdays.filter(d => draft.days.includes(d)).join(', ')], ['Compras', labels[draft.duration]], ['Tiempo para cocinar', draft.cookingTime ? 'Hasta ' + draft.cookingTime + ' min' : 'Sin preferencia']])}
              {summary(4, selectedStores(draft).map(store => [store.name, new URL(store.url).host.replace(/^www\./, '')] as [string, string]))}
              {reasons.length > 0 ? <div className="notice" role="status"><strong>Tu plan necesita una evaluación profesional.</strong><ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p>Consultá con un/a nutricionista para adaptar el plan a tu situación. La generación automática no está habilitada para estos casos.</p></div> : <div className="gentle-note"><span aria-hidden="true">i</span><p>En esta primera versión dejamos listo tu perfil. La generación de planes estará disponible en una próxima etapa. Las calorías del futuro plan serán una estimación.</p></div>}
              {finished && <div className="notice success-notice" role="status"><strong>Tu perfil está listo.</strong><p>Completaste todos los datos. La generación de planes todavía está en desarrollo; mientras tanto podés comparar precios con un carrito inicial.</p></div>}
              {finished && <CartPricing initialItems={starterCart(toDietProfile(draft))} stores={selectedStores(draft)} />}
            </>}
            </div>
            <footer className="form-footer">
              {step > 0 ? <button type="button" className="back-button" onClick={() => { setEditing(false); move(step - 1) }}>← Atrás</button> : <span className="required-note">Todos los campos de este paso son obligatorios.</span>}
              <button className="primary-button" type="submit" disabled={step === SUMMARY_STEP && (reasons.length > 0 || finished)}>{step === SUMMARY_STEP ? (finished ? 'Perfil listo ✓' : 'Generar mi plan') : editing ? 'Guardar y volver al resumen' : 'Continuar'}{step !== 4 && <span aria-hidden="true">→</span>}</button>
            </footer>
          </form>
        </div>
      </section>
    </main>
    <footer className="site-footer"><span>Hecho para tu día a día.</span><span>Remy · Alimentación con intención</span></footer>
  </div>
}
