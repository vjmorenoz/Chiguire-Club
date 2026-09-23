// ============================================
// CHIGÜIRE CLUB — CONFIGURACIÓN
// Este es el ÚNICO archivo que necesitas editar.
// ============================================

const CONFIG = {
  // 1. WhatsApp donde llegan los pedidos.
  //    Formato internacional, sin "+", sin espacios. Ej: 58 412 123 4567 → "584121234567"
  whatsappNumber: "584120522840",

  // 2. Usuario de Instagram (sin @)
  instagramUser: "chiguire.club",

  // 3. Supabase → Project Settings → API Keys
  //    - supabaseUrl: la "Project URL" (https://xxxx.supabase.co)
  //    - supabaseKey: la "Publishable key" (empieza por sb_publishable_)
  //    ⚠️ NUNCA pongas aquí la "Secret key" (sb_secret_...).
  //    Si los dejas vacíos, la tienda funciona en MODO DEMO (catálogo de ejemplo, sin guardar pedidos).
  supabaseUrl: "https://mgxsmjbhhjnocumqzarp.supabase.co",
  supabaseKey: "sb_publishable_Wsb5O5qNO8WWFr5xQPQKrQ__l9q1Cb_",

  // 4. Meta de pares vendidos (se muestra en el panel de pedidos)
  goalPairs: 100
};
