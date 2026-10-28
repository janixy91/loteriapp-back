# Loteriapp backend

El backend obtiene directamente de RTVE los resultados de la Lotería de
Navidad y de El Niño. Ya no descarga los JSON de un proveedor particular.

## Funcionamiento de la fuente

- Lee el resumen y los 20 rangos de números publicados por RTVE.
- Comprueba que la página pertenece al año configurado.
- Comprueba que los premios principales coinciden con la lista completa.
- Conserva en memoria el último resultado válido y rechaza regresiones o
  retiradas de premios.
- El cron guarda cada premio del resumen en Firebase, en las mismas ramas
  `/navidad`, `/nino` (o sus variantes `-dev`) que consume la aplicación.
- `GET /premios` lee el listado desde Firebase; RTVE alimenta ese listado, pero
  la aplicación no depende de que RTVE responda en el momento de abrirlo.
- Comparte una sola descarga entre todas las peticiones concurrentes y mantiene
  una caché de dos minutos por defecto.
- Mantiene el formato que ya consume la aplicación móvil.

Los estados `1` y `2` son provisionales. El estado `4` solo se publica si la
variable `LOTTERY_*_OFFICIALLY_VERIFIED` correspondiente vale `true`; debe
activarse únicamente después de contrastar la lista definitiva de SELAE.

## Configuración

Consulta [`.env.example`](./.env.example). OneSignal está desactivado por
defecto y no se crea ningún cliente ni se envía ninguna notificación mientras
`PUSH_NOTIFICATIONS_ENABLED` no sea exactamente `true`.

Al comenzar una nueva edición, el cron reinicia la rama del sorteo si el año
guardado en `_meta` no coincide. Esto evita mezclar premios de años distintos.

## Comprobaciones

```sh
npm test
LOTTERY_NAVIDAD_YEAR=2025 npm run verify:rtve -- navidad
LOTTERY_NINO_YEAR=2026 npm run verify:rtve -- nino
```

Los dos últimos comandos realizan una comprobación real contra las páginas
publicadas actualmente por RTVE. En producción se deben configurar los años de
la temporada vigente.

Con el servidor arrancado, `GET /premios/status?type=navidad` devuelve el año,
estado, fuente, número de resultados y si se está sirviendo una caché antigua
por un fallo temporal de RTVE.
