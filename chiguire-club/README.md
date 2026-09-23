# Chigüire Club — Tienda online

Tienda estática (HTML + CSS + JavaScript, sin frameworks). Catálogo y pedidos en Supabase; el cliente envía su pedido por WhatsApp.

**👉 Instalación paso a paso: [GUIA.md](GUIA.md)**

## Estructura

```
index.html                   Inicio, Tienda y Admin (#admin) en una sola página
admin/index.html             Redirige /admin → /#admin
css/styles.css               Tema Original (cálido)
css/styles-neobrutalism.css  Tema Web Neobrutalism (estilo neobrutalism.dev)
js/config.js                 ⚙️ Lo único que se edita: WhatsApp, Instagram, Supabase
js/brand.js                  Logo vectorizado
js/supabase.js               Cliente ligero de Supabase (sin librerías)
js/data.js                   Catálogo, carrito y pedido por WhatsApp
js/home.js · shop.js · admin.js · app.js
supabase/schema.sql          Base de datos, seguridad, fotos y catálogo inicial
.github/workflows/keep-alive.yml   Evita que Supabase gratis se pause
images/                      Logo, imagen para compartir (og.jpg)
```

## Probar en tu computadora

```
python3 -m http.server 8000
```
Abre http://localhost:8000. Sin Supabase configurado funciona en **modo demo**.

Comparar temas sin editar nada: http://localhost:8000/?tema=neo
