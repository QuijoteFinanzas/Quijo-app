# Quijo Finanzas - V1.1

Una app web para consultar la plantilla de seguimiento financiero del proyecto. El Excel sigue siendo la fuente de datos; la app es la vista y no modifica el archivo original.

## Contenido

- Inicio: patrimonio financiero y neto, evolución registrada y último mes.
- Cartera: gráfico interactivo, porcentajes visibles, desglose por bloques y agrupación de World/planes.
- Ahorro: selector de año, modo total/ordinario y detalle al tocar cada mes.
- Acciones: símbolos de marca locales, buscador, ordenación, valoración y dividendos registrados.
- Evolucion: histórico importado, crecimiento patrimonial y estimación de rentabilidad claramente separada.
- Plan: reparto del DCA y objetivos de liquidez configurables en privado.
- FIRE: escenarios configurables, no predicciones; permite excluir pensiones y dinero reservado.
- Datos: importación revisable, colección de cierres, guardado cifrado opcional, copia y restauración, salida pública solo en porcentajes.
- Tema claro/oscuro, ocultar importes, icono y manifiesto de app instalable.

## MUY IMPORTANTE: que se pública y que no

Esta carpeta contiene SOLO la aplicación vacia. No contiene datos financieros personales.

NO subas el Excel, una exportacion privada, una captura privada, una contraseña ni una copia cifrada a GitHub Pages. El .gitignore ayuda en Git, pero NO protege los archivos que subas manualmente por la web.

GitHub Pages es público en su configuración habitual, aunque el repositorio de origen sea privado. No es un servidor autenticado para documentos financieros. La app se descarga desde Pages, pero lee el archivo que elijas localmente con JavaScript; no tiene endpoint de subida ni analítica, CDN, fuentes remotas o peticiones de cotizaciones.

## Publicar en GitHub Pages (sin instalar herramientas)

1. Crea un repositorio DEDICADO, por ejemplo `quijo-app`. No sustituyas el index de quijotefinanzas.com.
2. Descomprime este ZIP. Sube EL CONTENIDO de esta carpeta a la raíz del repositorio. `index.html` debe estar en la raíz, junto a `app.js`, `style.css`, los demas JS, `sw.js`, `manifest.webmanifest` y `assets/`.
3. No subas el ZIP como un único archivo. Usa Add file > Upload files y conserva la estructura de assets.
4. En Settings > Pages, elige Deploy from a branch, rama main y carpeta / (root). Guarda. La disponibilidad de Pages depende del plan y la visibilidad del repositorio.
5. Espera al despliegue y abre la dirección HTTPS que indique GitHub. Comprueba las pantallas y la importación.
6. Si el repositorio no permite Pages con su visibilidad actual, el código de esta app vacia puede publicarse en un repositorio público. Nunca resuelvas esto incluyendo el Excel.

Referencia: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

No necesita Node, Python ni compilación en producción. Son archivos estáticos. Puede servirse también en otro alojamiento HTTPS.

## iPhone

Abre la URL HTTPS en Safari > Compartir > Añadir a pantalla de inicio (y Abrir como app web si aparece). Abre el nuevo icono y, DESDE AHI, importa el Excel desde Archivos. El almacenamiento de la app instalada puede estar separado del de una pestaña; importa/restaura en el lugar que vayas a utilizar.

El código incluye cache sin conexión. Para inicializarla hace falta una primera carga en linea. Prueba el modo avion después de publicar e instalar: la persistencia y el comportamiento offline en Safari real no se han verificado desde este entorno.

## Importar cada cierre

1. Actualiza y guarda el Excel con su estructura habitual.
2. En la app, Importar cierre > selecciona el archivo.
3. Revisa posiciones, totales, notas y fecha real. La fecha se propone a partir de la última columna, pero debes confirmarla: no se infiere que todas las valoraciones sean de fin de mes.
4. Confirma la importación. Si esa fecha existe, la app exige aceptar la sustitucion; no suma el cierre dos veces.
5. Si tienes guardado cifrado abierto, se guarda el nuevo cierre cifrado. De lo contrario trabaja solo en memoria: perderás los datos al recargar hasta que los guardes.
6. Exporta una copia cifrada periódicamente, especialmente antes de borrar datos del navegador o cambiar de móvil.

Hojas reconocidas: Fondos, Cuentas, Seguimiento Cartera, Seguimiento Ahorro y Acciones (MyInvestor). El adaptador es especifico de la plantilla recibida. Si cambias de posicion columnas, nombres de hojas o fórmulas, revisa el adaptador antes de confiar en la importación.

Límite: XLSX/JSON de 12 MB. No soporta libros protegidos con contraseña, XLS binario o Numbers. Las macros no se ejecutan. Lee fórmulas numéricas habituales con un analizador limitado; si una formula necesaria no es compatible ni tiene valor calculado, rechaza la lectura en lugar de inventar un saldo. El navegador debe admitir DecompressionStream con deflate-raw para XLSX.

## Privacidad y copias

- Al principio los datos solo estan en memoria.
- Guardar cifrado usa AES-GCM 256, PBKDF2 SHA-256, sal y vector aleatorios; el archivo cifrado se conserva en IndexedDB. Requiere contexto seguro HTTPS/localhost y navegador compatible.
- La contraseña y la clave de sesión no se guardan. No hay recuperación de contraseña. Perderla implica volver al Excel o a otra copia accesible.
- El boton del ojo es SOLO una máscara visual. No es cifrado ni autenticación. Cuando desbloqueas, los datos se procesan en memoria.
- Se puede bloquear manualmente; tras permanecer en segundo plano más de un minuto, se bloquea al regresar si existe guardado cifrado.
- El navegador puede borrar el almacenamiento. Guarda copias y conserva siempre el Excel original.
- No hay sincronización automática entre dispositivos. Puedes importar el mismo Excel o restaurar la copia cifrada en otro dispositivo.
- No es una auditoría de seguridad profesional. Mantener el repositorio y el dispositivo seguros sigue siendo necesario. No anadas scripts externos ni analítica al código que procesa datos desbloqueados. Un dominio/origen dedicado reduce la convivencia con otras aplicaciones.

## Salida pública QuijoCartera

En Cartera o Datos > Version pública puedes generar JSON y una tarjeta PNG. La salida se construye con campos permitidos: fecha, productos, identificadores y porcentajes. No exporta saldos, número de acciones, ingresos, nombres de titulares ni presupuesto DCA.

Comprueba la vista antes de publicar. No publiques una copia privada simplemente ocultando los números con CSS.

## Metodología financiera

- Patrimonio financiero: posiciones + cuentas. Patrimonio neto: añade activos reales y resta deudas.
- Liquidez disponible: excluye cuentas marcadas de uso restringido, que siguen dentro del patrimonio.
- La distribucion usa grupos de productos. Gamma figura en defensivos aunque sea mixto; no es una reconstrucción de exposición a cada subyacente.
- World agrupa Vanguard y Fidelity en la vista pública; los dos planes se agrupan también. El dato individual se conserva en privado.
- La gráfica de crecimiento incluye dinero aportado/retirado: NO es rentabilidad.
- La estimación mensual replica (inversión final - inicial - flujo registrado) / inicial. Se encadenan las estimaciones, pero NO se presentan como TWR auditada: faltan fechas de algunos flujos y la conciliación de traspasos.
- El histórico previo a septiembre de 2026 incluye observaciones a mitad de mes. Se mantiene como tal, no se transforma en cierres homogéneos.
- Las acciones muestran resultado de posiciones abiertas con los dividendos registrados. No incluyen ventas antiguas no disponibles ni son una rentabilidad anualizada.
- DCA: es una asignacion programada. Un traspaso entre fondos no es ahorro nuevo. El presupuesto privado se configura aparte del reparto porcentual preestablecido.
- FIRE: supuestos reales, aportación al final de cada año, sin impuestos ni pensión pública. No usa una promesa de rendimiento ni presupone que un PP sea líquido de inmediato.
- No hay benchmark, Sharpe, alfa, precios diarios inventados ni conexión bancaria/broker en esta entrega.

## Pruebas de esta entrega

Probados con el Excel recibido: importación local, reconciliacion de totales, agrupaciones, exportacion porcentual, detalle mensual, fichas de acciones y navegación. Pruebas de interfaz Chromium a 320, 390 y 1440 px, claro/oscuro, sin errores JS en el recorrido ni solicitudes de datos externas. Pruebas de modelo y cifrado con Web Crypto real (almacen de prueba en memoria).

Pendiente de verificación en despliegue: instalación en iPhone, persistencia IndexedDB real, descarga/restauración por Safari y recarga offline con service worker. El entorno de pruebas bloquea la navegación de Chromium a URLs; por eso la prueba de interfaz se hizo cargando el documento local en memoria. No se ha publicado la app.

Antes de uso habitual: pública, importa, guarda cifrado, recarga/desbloquea, exporta/restaura la copia y prueba modo avion. Conserva el Excel.

## Referencias visuales

- https://netoapp.es/ : resumen financiero y navegación por areas.
- https://nodofinx.com/ : importación revisable y separacion entre ahorro, movimientos e inversión.
- Se recibieron Rumbo (https://github.com/danidm98/rumbo) y un video como referencias. No se pudo recuperar su contenido; no se reutilizo su código ni se asume ninguna licencia.

El diseño y código de Quijo de esta carpeta son independientes, no una copia de esas aplicaciones. Los símbolos de acciones son versiones vectoriales simplificadas, locales, para identificación; no son activos oficiales descargados. Marcas y nombres pertenecen a sus titulares. No se distribuyen fuentes tipográficas.

## Actualizaciones

Sube solo los archivos de la app. Cambia la versión de cache en sw.js cuando cambies recursos estáticos. Cierra todas las ventanas de la app y vuelve a abrir con conexión para activar el nuevo service worker. Actualizar el código no debe borrar IndexedDB; usa copia antes de cualquier cambio importante.
