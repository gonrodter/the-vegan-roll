/**
 * Función serverless (Vercel) que recibe las solicitudes de reserva y las envía por email.
 *
 * Variables de entorno necesarias:
 *   RESEND_API_KEY  clave de https://resend.com
 *   RESERVAS_TO     destinatario, p. ej. theveganroll@gmail.com
 *   RESERVAS_FROM   remitente verificado, p. ej. "The Vegan Roll <reservas@theveganroll.com>"
 */

const REQUIRED = ['nombre', 'email', 'telefono', 'fecha', 'hora'];

const escape = (value = '') =>
  String(value).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // Trampa antispam: si viene rellena, fingimos éxito y no enviamos nada.
  if (body.empresa) return res.status(200).json({ ok: true });

  const missing = REQUIRED.filter((field) => !String(body[field] || '').trim());
  if (missing.length) {
    return res.status(400).json({ error: `Faltan campos: ${missing.join(', ')}` });
  }

  const { RESEND_API_KEY, RESERVAS_TO, RESERVAS_FROM } = process.env;
  if (!RESEND_API_KEY || !RESERVAS_TO || !RESERVAS_FROM) {
    console.error('Faltan variables de entorno para el envío de reservas');
    return res.status(500).json({ error: 'Servicio de reservas no configurado' });
  }

  const rows = [
    ['Nombre', body.nombre],
    ['Email', body.email],
    ['Teléfono', body.telefono],
    ['Día', body.fecha],
    ['Hora', body.hora],
    ['Personas', body.personas],
    ['Notas', body.notas || '—']
  ];

  const html = `
    <h2 style="font-family:Georgia,serif">Nueva solicitud de reserva</h2>
    <table style="font-family:Georgia,serif;border-collapse:collapse">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 16px 4px 0;color:#4a4c45">${label}</td><td style="padding:4px 0"><strong>${escape(value)}</strong></td></tr>`
        )
        .join('')}
    </table>`;

  try {
    const send = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESERVAS_FROM,
        to: [RESERVAS_TO],
        reply_to: body.email,
        subject: `Reserva ${body.fecha} ${body.hora} · ${body.nombre} (${body.personas || '?'} pax)`,
        html
      })
    });

    if (!send.ok) throw new Error(await send.text());
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error enviando la reserva:', error);
    return res.status(502).json({ error: 'No se ha podido enviar la reserva' });
  }
}
