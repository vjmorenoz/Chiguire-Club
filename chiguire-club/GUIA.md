# Guía de instalación — Chigüire Club

Tiempo estimado: 45 minutos. Solo necesitas un correo y una computadora. Todo es gratis.

## Cómo funciona la tienda

| Pieza | Para qué sirve | Costo |
|---|---|---|
| **GitHub Pages** | Aloja la página web | Gratis |
| **Supabase** | Guarda productos, fotos y pedidos. Controla quién entra al admin | Gratis (ver paso 8) |
| **WhatsApp** | Donde recibes los pedidos y cierras la venta | Gratis |

El cliente arma su carrito y toca **Enviar pedido por WhatsApp**. En ese momento el pedido queda guardado en Supabase con un código (ej. `CC-7K3QD`) y se abre WhatsApp con el mensaje listo. Tú ves ese mismo código en tu panel `/admin`.

---

## 1. Probar en tu computadora (opcional)

Si tienes Python instalado, abre una terminal dentro de la carpeta `chiguire-club` y ejecuta:

```
python3 -m http.server 8000
```

Abre http://localhost:8000 en el navegador. Verás una franja amarilla de **modo demo**: la tienda funciona con productos de ejemplo, pero no guarda pedidos hasta que conectes Supabase.

Para comparar los dos diseños: http://localhost:8000/?tema=neo

---

## 2. Supabase: crear el proyecto

1. Entra a **supabase.com** y crea una cuenta. Puedes entrar con tu cuenta de GitHub.
2. Toca **New project** y complétalo:
   - **Name:** `chiguire-club`
   - **Database password:** toca "Generate" y **guárdala** en un lugar seguro. No la necesitarás en la tienda, pero sí si algún día migras.
   - **Region:** la más cercana a Venezuela que aparezca (por ejemplo, East US).
3. Espera unos 2 minutos mientras se crea.

---

## 3. Supabase: crear la base de datos

1. En el menú izquierdo, entra a **SQL Editor**.
2. Toca **New query**.
3. Abre el archivo `supabase/schema.sql` con cualquier editor de texto, copia **todo** su contenido y pégalo.
4. Toca **Run** (o Ctrl+Enter).
5. Debe decir **Success**. Si aparecen avisos amarillos del tipo "does not exist, skipping", son normales.

Esto crea:
- La tabla de **productos**, con los 12 productos de ejemplo.
- La tabla de **pedidos**.
- La tabla de **administradores**.
- El almacenamiento de **fotos** (`product-images`).
- Todas las **reglas de seguridad**.

Puedes revisarlo en **Table Editor**: debe aparecer la tabla `products` con 12 filas.

> Si algún día tienes que ejecutarlo de nuevo, no pasa nada: no duplica productos ni borra datos.

---

## 4. Supabase: tu usuario de administrador

**4.1 Cerrar el registro público.** Así nadie más puede crearse una cuenta:
- Ve a **Authentication → Sign In / Providers**.
- Desactiva **"Allow new users to sign up"** y guarda.

**4.2 Crear tu usuario:**
- Ve a **Authentication → Users → Add user → Create new user**.
- Escribe tu correo y una contraseña fuerte.
- Marca **Auto Confirm User** y crea.

**4.3 Darte permisos de admin.** Tener usuario no basta; hay que marcarlo como administrador:
- Ve a **SQL Editor → New query** y pega esto, cambiando el correo por el tuyo:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'tu-correo@ejemplo.com';
```

- Toca **Run**. Debe decir "1 row".

Si más adelante quieres agregar un socio, repite 4.2 y 4.3 con su correo.

---

## 5. Conectar la tienda con Supabase

1. En Supabase, toca el botón **Connect** (arriba) o ve a **Project Settings → API Keys**.
2. Copia estos dos datos:
   - **Project URL:** algo como `https://abcdefgh.supabase.co`
   - **Publishable key:** empieza por `sb_publishable_`
3. Abre `js/config.js` y pégalos:

```js
supabaseUrl: "https://abcdefgh.supabase.co",
supabaseKey: "sb_publishable_xxxxxxxxxxxx",
```

4. En el mismo archivo, pon tu **número de WhatsApp** en formato internacional, sin `+` ni espacios. Por ejemplo, `0412-123-4567` se escribe `584121234567`.
5. Revisa también tu usuario de **Instagram**.

> ⚠️ **Muy importante:** usa solo la **Publishable key**. La **Secret key** (`sb_secret_...`) da acceso total y **nunca** debe ir en la web. La Publishable key sí es pública por diseño: la seguridad la ponen las reglas del paso 3.

Si probaste en local (paso 1), recarga la página: la franja de modo demo desaparece y ya estás usando tu base de datos real.

---

## 6. GitHub: subir la tienda

1. Crea una cuenta en **github.com**. Tu usuario formará parte de la dirección de la tienda.
2. Toca **+ → New repository**:
   - **Name:** `chiguire-club`
   - **Public.** Es necesario para usar GitHub Pages gratis.
   - Toca **Create repository**.
3. En la página del repositorio vacío, toca **"uploading an existing file"**.
4. Abre la carpeta `chiguire-club` en tu computadora, selecciona **todo su contenido** (no la carpeta en sí) y arrástralo a la página.
5. Abajo, toca **Commit changes**.

**La carpeta `.github` es invisible en Mac y a veces no se sube.** Créala a mano:
1. En el repositorio, ve a **Add file → Create new file**.
2. En el nombre escribe exactamente: `.github/workflows/keep-alive.yml` (GitHub crea las carpetas al escribir `/`).
3. Pega el contenido del archivo `keep-alive.yml` y toca **Commit changes**.

---

## 7. GitHub Pages: publicar la tienda

1. En el repositorio, ve a **Settings → Pages**.
2. En **Build and deployment → Source**, elige **Deploy from a branch**.
3. En **Branch**, elige `main` y `/ (root)`, y toca **Save**.
4. Espera 1–2 minutos y recarga. Arriba aparecerá la dirección de tu tienda:

```
https://TU-USUARIO.github.io/chiguire-club/
```

5. **Imagen al compartir el link:** en `index.html`, busca la línea `og:image` y cambia `TU-USUARIO` por tu usuario de GitHub. Para editar en GitHub: abre el archivo, toca el lápiz ✏️ y luego **Commit changes**.

Ese es el link que va en tu **bio de Instagram**. El panel queda en `https://TU-USUARIO.github.io/chiguire-club/admin`.

> **Para cambiar algo más adelante:** edita el archivo en GitHub con el lápiz y haz commit. La web se actualiza sola en 1–2 minutos. Si no ves el cambio, recarga forzando (Ctrl+Shift+R, o Cmd+Shift+R en Mac).

---

## 8. Evitar que Supabase se pause

El plan gratis de Supabase **pausa el proyecto tras 7 días sin actividad**. Si pasa, la tienda no puede cargar el catálogo. Los visitantes ven un mensaje con un botón directo a tu WhatsApp, así que no pierdes la venta, pero conviene evitarlo.

El archivo `keep-alive.yml` hace una consulta automática cada 3 días. Para activarlo:

1. En GitHub, ve a **Settings → Secrets and variables → Actions → New repository secret** y crea dos:
   - `SUPABASE_URL` → tu Project URL
   - `SUPABASE_PUBLISHABLE_KEY` → tu Publishable key
2. Ve a la pestaña **Actions**. Si pide activar los workflows, acéptalo.
3. Entra a **Mantener Supabase activo → Run workflow** para probarlo. Debe salir un ✅ verde.

Ten en cuenta dos cosas:
- **Si el repositorio pasa 60 días sin cambios, GitHub desactiva las tareas programadas.** Te llega un correo; basta con reactivarla en Actions.
- **Si ya se pausó**, entra a Supabase y toca **Restore project**. Tus datos no se pierden.
- **Para una tienda con ventas constantes**, el plan Pro de Supabase (USD 25/mes) nunca se pausa. Para los primeros 100 pares, el plan gratis con este workflow es suficiente.

---

## 9. Cargar productos y fotos

1. Entra a `https://TU-USUARIO.github.io/chiguire-club/admin` con el correo y la contraseña del paso 4.
2. En la pestaña **🧦 Productos** puedes:
   - **+ Agregar producto:** nombre, precio, categoría, descripción y foto.
   - **✏️ Editar:** cambiar precio, categoría, foto o cualquier dato.
   - **Visible / Oculto:** si una media se agota, **ocúltala** en vez de borrarla. Así conservas su foto y la reactivas cuando llegue stock.
   - **⭐ Destacado:** aparece en "Los más queridos" del inicio (se muestran hasta 4).
   - **🗑️ Borrar:** la elimina junto con su foto.
3. Los 12 productos de ejemplo usan emojis. Reemplázalos por tus productos reales, o edítalos y súbeles foto.

**Consejos para las fotos**
- **Formato cuadrado**, porque la tienda las muestra 1:1.
- **Luz natural** junto a una ventana, sin flash.
- **Fondo liso**: una cartulina crema o blanca queda perfecta con el diseño.
- **Una sola media o el par, bien centrados.**
- No te preocupes por el peso: el panel reduce la foto a 800px y la comprime a unos 60 KB antes de subirla. El plan gratis tiene 1 GB, suficiente para miles de fotos.

---

## 10. Cómo funcionan las compras

**Lo que hace el cliente**
1. Entra desde tu link de Instagram, agrega medias al carrito y toca **Enviar pedido por WhatsApp**.
2. Se abre WhatsApp con este mensaje listo para enviar:

```
Hola Chigüire Club.
Quiero pedir:
- Media Pizza x2
- Media Pac-Man x1

Total: $22
Pedido: CC-7K3QD
Gracias.
```

**Lo que haces tú**

| Paso | En WhatsApp | En /admin → 📋 Pedidos |
|---|---|---|
| 1 | Te llega el mensaje con el código | El pedido ya aparece como **🆕 Nuevo** |
| 2 | Confirmas stock y envío, y mandas tus datos de pago | Cámbialo a **👍 Confirmado** |
| 3 | El cliente te manda el comprobante | Cámbialo a **💵 Pagado**. Ahí cuenta para tu meta de 100 pares |
| 4 | Envías el paquete y pasas la guía | **📦 Enviado** |
| 5 | Lo recibe | **✅ Entregado** |
| — | Si no concreta | **✖ Cancelado** |

**Detalles importantes**
- **El código conecta el chat con el pedido.** Busca `CC-XXXXX` en el panel.
- **Los precios no se pueden manipular.** Aunque alguien edite el mensaje de WhatsApp, el pedido guardado en Supabase se calcula con tus precios reales. Si el total del chat no coincide con el del panel, manda el del panel.
- **Si el cliente toca el botón dos veces** con el mismo carrito, no se duplica el pedido.
- **La barra "Meta de pares vendidos"** solo suma pedidos Pagados, Enviados o Entregados.

**Consejo con WhatsApp Business (gratis):**
- Crea **respuestas rápidas**, por ejemplo `/pago` con tus datos de pago móvil o transferencia, y `/envio` con las opciones de envío.
- Usa **etiquetas** con los mismos nombres de los estados (Nuevo, Pagado, Enviado…) para ver tu día de un vistazo.

---

## 11. Elegir el diseño

Hay dos temas con la misma tienda por dentro:

| Tema | Archivo | Estilo |
|---|---|---|
| **Original** | `css/styles.css` | Cálido y marrón, con botones que "flotan" al pasar el mouse |
| **Web Neobrutalism** | `css/styles-neobrutalism.css` | Estilo neobrutalism.dev: cuadrícula de fondo, bloques planos, texto negro, botones que se "hunden" |

- **Para comparar sin tocar nada:** agrega `?tema=neo` o `?tema=original` al final de tu link.
- **Para fijar el definitivo:** en `index.html`, busca `href="css/styles.css"` y cámbialo por el archivo que prefieras.

---

## 12. Antes de lanzar (checklist)

- [ ] `js/config.js`: número de WhatsApp real (prueba un pedido y confirma que te llega a ti).
- [ ] `js/config.js`: usuario de Instagram correcto.
- [ ] `js/home.js`: revisa las respuestas del **FAQ** (envíos, pagos, tallas) con tu información real.
- [ ] `index.html`: `og:image` con tu dirección (paso 7.5).
- [ ] Productos reales cargados, con foto; los de ejemplo, ocultos o borrados.
- [ ] Workflow de Supabase activo, con ✅ verde en Actions.
- [ ] Haz un pedido de prueba desde tu teléfono, **abriendo el link desde Instagram**, y márcalo como Cancelado.
- [ ] Link en la bio de Instagram.

---

## 13. Problemas comunes

**Sigue apareciendo "Modo demo"**
Revisa que `supabaseUrl` y `supabaseKey` en `js/config.js` estén entre comillas y sin espacios. Luego recarga forzando.

**"No pudimos cargar el catálogo"**
El proyecto de Supabase puede estar pausado; entra y toca **Restore**. Si no es eso, revisa la URL en `config.js`.

**Entré al admin, pero dice "Este usuario no es administrador"**
Falta el paso 4.3, o el correo no coincide exactamente.

**"Correo o contraseña incorrectos"**
Revisa en **Authentication → Users** que el usuario exista y esté confirmado.

**No se sube la foto**
Asegúrate de que el paso 3 terminó sin errores y de que en **Storage** existe el bucket `product-images`.

**Los pedidos no aparecen en el panel**
Prueba **↻ Actualizar**. Si tampoco aparecen, confirma que el paso 3 se ejecutó completo, incluida la tabla `orders`.

**Cambié algo en GitHub y no lo veo**
Espera 2 minutos y recarga forzando (Ctrl+Shift+R).

**GitHub muestra error 404**
Revisa **Settings → Pages**: la rama debe ser `main` y la carpeta `/ (root)`. Además, `index.html` debe estar en la raíz del repositorio, no dentro de otra carpeta.

---

## 14. Seguridad: qué es público y qué no

| Dato | ¿Público? | Por qué es seguro |
|---|---|---|
| Publishable key (en `config.js`) | Sí | Es su función. Las reglas de la base de datos deciden qué se puede hacer con ella |
| Catálogo visible | Sí | Es la vitrina |
| Productos ocultos | No | Solo los ve el admin |
| Pedidos | No | Los visitantes pueden crearlos, pero nadie más que el admin puede leerlos |
| Precios en los pedidos | No manipulables | Los recalcula la base de datos |
| Subir o borrar fotos, editar productos | Solo admin | Exige iniciar sesión y estar en la tabla `admins` |
| Secret key y contraseña de la base de datos | **Nunca** | No aparecen en ningún archivo de la tienda. Mantenlas así |
