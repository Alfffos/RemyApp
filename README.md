# Remy

Aplicación Next.js con React, TypeScript, Tailwind CSS y validaciones Zod.

## Desarrollo

Requiere Node.js 24 o superior para ejecutar las pruebas TypeScript sin transpilar.

```sh
npm ci
npm run dev
```

## Validación

```sh
npm run typecheck
npm test
npm run build
```

## Perfil alimentario

La página principal contiene cinco pasos y un resumen editable: datos personales,
actividad cotidiana y ejercicio, objetivo, alimentación y horarios, y salud.
Los datos se conservan únicamente en el estado de React. Recargar o cerrar la
página descarta las respuestas; no se utilizan cookies ni almacenamiento local
para el perfil y no se envían los datos a una API o base de datos.

La generación de dietas todavía no está conectada: el botón final valida el
perfil e informa que está listo. Los casos de menores, embarazo, lactancia o
condiciones que requieran adaptar la alimentación muestran una indicación de
evaluación profesional y bloquean la generación automática.

`lib/profile/profile.ts` contiene las validaciones y el contrato de datos para
el futuro generador, con medidas numéricas y respuestas condicionales depuradas.
Las restricciones deberán validarse también del lado del servidor cuando se
implemente esa integración. Los rangos de entrada son controles de captura,
no criterios de aptitud nutricional.

La conexión de prueba existente con OpenRouter permanece en `/api/generate` y
requiere `OPENROUTER_API_KEY` (ver `.env.example`). El formulario no la utiliza.
