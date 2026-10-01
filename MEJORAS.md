# Quijo Finanzas V1.3 - Alcance completo de la mejora

Esta entrega sustituye el paquete V1.2. Incluye las tres pantallas de analisis de V1.2 y completa la experiencia de las secciones iniciales. La aplicacion distribuida esta vacia: se usa importando tu Excel o desbloqueando tu copia local.

## Lista de funciones

| Lo que se habia planteado | Implementado en V1.3 | Donde verlo |
|---|---|---|
| Inicio tipo dashboard | Patrimonio financiero/neto, cambio de valor, caja, peso RV, ahorro del ultimo mes, estimacion anual con advertencia, DCA y accesos | Inicio |
| Ultimos cambios | Principales variaciones de peso entre dos fotos guardadas; sin atribuirlas automaticamente al mercado | Inicio / Mes a mes |
| Cartera interactiva | Sectores con hit area real, leyenda pulsable, seleccion visible y enlace al detalle en movil | Cartera |
| Peso, valor y productos | Alternar porcentaje del bloque / del total; ficha de cada agrupacion; World y PP agrupados | Cartera |
| Rentabilidad por producto | Resultado individual de origen; NO media de rentabilidades con distintas fechas | Cartera / ficha |
| Variacion de pesos | Cambios en puntos porcentuales por bloque y producto, si existe otra foto | Cartera / Mes a mes |
| Ahorro mensual tocable | Barras y lista de meses; detalle total, ordinario y extras; anterior/siguiente | Ahorro |
| Perspectiva del ahorro | Media, mediana, meses positivos, mayor/menor excedente y diferencia con el mes anterior | Ahorro |
| Fichas de acciones | Logos locales con presentacion uniforme, coste, valor, dividendos, peso y resultado simple | Acciones |
| Buscar y ordenar | Nombre/ticker; filtro todas/positivo/negativo; ordenar por peso, resultado, contribucion, dividendos o nombre | Acciones |
| Contribucion por accion | Resultado de posicion y dividendos dividido entre el coste del bloque. No alfa ni atribucion temporal | Acciones / ficha |
| Historico individual | Evolucion del valor en fotos importadas, sin precios diarios ni compras ficticias | Ficha de accion o fondo, con 2 fotos |
| Evolucion separada | Financiero, patrimonio neto, invertido y rentabilidad; selector de ano y Todo | Evolucion |
| Estimacion vs conciliacion | Excel aproximado separado de Modified Dietz con flujos confirmados | Evolucion / Benchmark |
| Comparativa mensual | Saldos, flujos conciliados, residual y pesos; nuevas/ausentes, no compras/ventas inferidas | Mes a mes |
| Objetivos | Metas editables, base de saldo, progreso, fecha y necesidades mensuales | Objetivos |
| Referencia y riesgo | Benchmark de datos importados, mismos meses, 75/25 opcional; sin rellenar vacios | Benchmark |
| Privacidad mejorada | Ojo oculta importes; modo presentacion solo renderiza la lista publica de composicion y DCA | Menu > Modo presentacion |
| Exportacion publica | Vista previa, toda la cartera / bloque / DCA; oscuro/claro; PNG para web/X, Instagram y cuadrado; JSON compatible | Exportar |
| Pulido visual | Jerarquia, iconos, espaciado, estados vacios, teclado, tamanos tactiles y movimiento reducido | Toda la app |
| Historial de cierres | Conserva fotos y permite seleccionarlas; no fabrica desglose de periodos anteriores | Inicio / Datos |

## Distinciones importantes

- El crecimiento patrimonial incluye entradas y salidas. No se etiqueta como rentabilidad.
- Los resultados de entrada de los fondos no se promedian para fabricar una rentabilidad del bloque.
- En la vista Todo de rentabilidad estimada se muestra el ultimo tramo continuo calculable, sin resetear al cambiar de ano ni unir meses con huecos. Se indica si se ha excluido algun tramo.
- Modified Dietz usa las confirmaciones y flujos fechados ya implementados en V1.2. No se anuncia como TWR exacta.
- Comparar pesos requiere dos fotos detalladas importadas. Una columna antigua del Excel con el total no reconstruye la cartera de aquel dia.
- La referencia de mercado sigue necesitando una serie real con fuente. La plantilla CSV solo tiene cabeceras.
- Los logos son simbolos vectoriales locales de identificacion ya presentes en la app, ahora normalizados en sus tarjetas; no se presentan como un paquete de recursos oficiales. No se descargan logos ni fuentes al abrir la app.
- No se incluyen cotizaciones en directo, conexion bancaria, sincronizacion PC/iPhone ni migracion a un servidor.

## Privacidad

El ojo es una mascara visual. El modo presentacion va mas alla: no monta las pantallas de patrimonio, ahorro, metas o flujos y utiliza solo el objeto de exportacion publica para componer la vista. Ninguno sustituye al bloqueo cifrado cuando no quieras que el navegador conserve la sesion desbloqueada.

La tarjeta se dibuja a partir del objeto publico, no mediante una captura del dashboard privado. El JSON mantiene el formato publico anterior. No se exportan importes, unidades de acciones, ingresos, coste, titulares, objetivos privados ni presupuesto de aportaciones.

## Comprobaciones realizadas

- Importacion del XLSX proporcionado con el adaptador existente; sin modificar el Excel.
- 22 pruebas unitarias de agrupaciones, porcentajes, retornos estimados, huecos, flujos y ahorro.
- 65 recorridos de pantallas en Chromium a 320, 390, 768 y 1440 px, temas claro/oscuro, sin errores JavaScript ni desbordamiento horizontal.
- Pulsaciones reales sobre los seis sectores del grafico, incluidos los pequenos, y seleccion mediante teclado.
- Cambio de base de porcentajes, filtros, busqueda, orden, fichas, meses de ahorro y selector temporal.
- Exportacion JSON publica y las tres dimensiones de PNG para cartera, bloques y DCA.
- Segunda foto sintetica SOLO EN LAS PRUEBAS, fuera del paquete, para cambios de pesos e historicos individuales.
- Compatibilidad de una copia de formato anterior, cifrado/descifrado WebCrypto real, guardado y rechazo de contrasena incorrecta, con IndexedDB simulado.
- Importador, modulo de cifrado, modelo base y calculos de Benchmark de V1.2 conservados byte a byte.

Limites de verificacion: la politica del navegador del entorno bloquea la navegacion HTTP local; se han cargado los archivos en memoria para probar la interfaz. La instalacion, activacion del service worker, IndexedDB real, descargas Safari y recarga offline deben probarse en el despliegue y en tu iPhone. No se ha publicado esta entrega en tu repositorio ni se ha hecho una auditoria independiente de seguridad.
