# Actualizar Quijo Finanzas a V1.3

## Antes

En la app actual, abre Datos y ajustes y exporta una copia cifrada. Conserva su contrasena y el Excel original. No borres el almacenamiento del navegador.

V1.3 es el paquete completo. Puedes actualizar directamente desde V1.1 o V1.2: no hay que instalar una version intermedia.

## Subida a GitHub

1. Descomprime `Quijo_Finanzas_V1_3_GitHub.zip`.
2. Entra en el MISMO repositorio de la app (no el de la web de QuijoteFinanzas).
3. Usa Add file > Upload files y sube todo el contenido descomprimido, sustituyendo archivos del mismo nombre. No subas el ZIP como archivo ni una carpeta que lo envuelva.
4. `index.html` debe seguir en la raiz. Tambien deben estar `experience.js` y `public-card.js`, que son nuevos. Conserva `insights.js`, `insights-ui.js`, el resto de JS, la hoja de estilos, el manifiesto, `sw.js` y `assets/`.
5. Confirma con Commit changes y espera a que termine el despliegue de Pages. La configuracion de Pages no cambia.
6. Abre la misma URL con conexion. Desde V1.2 puedes usar Datos y ajustes > Buscar actualizacion. Antes de activar/recargar guarda la sesion si aun estaba solo en memoria.
7. Cierra todas las pestanas y ventanas de esa app, incluida la instalada, y vuelve a abrirla con conexion si sigues viendo la version anterior. Una segunda apertura puede ser necesaria para activar el service worker nuevo.
8. Comprueba V1.3 en la barra lateral o en Datos y ajustes y desbloquea con la contrasena habitual.

No se cambia el nombre de la base de datos, la clave de almacenamiento, el esquema del sobre cifrado ni la ruta de la app. No hagas una instalacion nueva en otra carpeta si quieres reutilizar los datos locales.

**No subas Excel, copias cifradas, capturas privadas, exportaciones privadas ni contrasenas a GitHub.** El paquete es solo codigo y recursos de la aplicacion vacia.

## Prueba corta despues de actualizar

- Inicio: confirma la version y el cierre activo.
- Cartera: toca Oro o Bitcoin y luego un bloque grande; alterna Del bloque / Del total.
- Ahorro: toca un mes y utiliza anterior/siguiente en su ficha.
- Acciones: busca una compania, prueba un filtro y abre su detalle.
- Evolucion: cambia 2025 / 2026 / Todo y distingue Excel aproximado de Conciliada.
- Menu > Modo presentacion: no deben aparecer importes, ahorro o metas privadas.
- Exportar: cambia contenido y formato y genera una PNG. Comprueba tambien la copia cifrada de seguridad.

Con un solo cierre, Mes a mes y el historico de una accion explicaran que falta otra foto. El Benchmark no inventa una referencia ni calcula una comparacion sin los flujos necesarios.

## Si algo falla

No borres datos del sitio. Exporta una copia si puedes y conserva la copia anterior. Si aparece la app vacia, comprueba que has abierto la misma URL, navegador y perfil. Manda una captura del aviso (sin importes) para revisar la causa antes de tocar el almacenamiento.

No hay sincronizacion automatica entre dispositivos en V1.3. Restaurar una copia en otro dispositivo es una transferencia manual, no una sincronizacion.

## Archivos nuevos

- `experience.js`: calculos de presentacion y series.
- `public-card.js`: dibujado de tarjetas a partir de datos exclusivamente publicos.
- `MEJORAS.md`: lista completa de lo implementado y sus limites.

Referencia tecnica de actualizaciones del service worker:
https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
