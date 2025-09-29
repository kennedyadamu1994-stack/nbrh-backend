const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret, X-Timestamp, X-Signature');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const data = req.body;
    
    // Send email using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    const contact = data.contact || {};
    const pricing = data.pricing_breakdown || {};
    const leadtime = data.leadtime_breakdown || {};
    
    let basketHtml = '<ul>';
    (data.basket || []).forEach(item => {
      basketHtml += `<li><strong>${item.sub_service}</strong> (${item.core_service}) - £${item.base_price} - ~${item.base_lead_days} days</li>`;
    });
    basketHtml += '</ul>';
    
    let addonsHtml = '';
    if (data.global_addons && data.global_addons.length > 0) {
      addonsHtml = `<p><strong>Add-ons:</strong> ${data.global_addons.join(', ')}</p>`;
    }
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'kennedy_adamu@yahoo.co.uk',
      replyTo: contact.email,
      subject: `New Enquiry from ${contact.name} - ${contact.club}`,
      html: `
        <h2>New NBRH Enquiry</h2>
        <h3>Contact</h3>
        <p>Name: ${contact.name}<br>
        Email: ${contact.email}<br>
        Club: ${contact.club}<br>
        Phone: ${contact.phone || 'N/A'}</p>
        <h3>Services</h3>
        ${basketHtml}
        ${addonsHtml}
        <h3>Pricing Breakdown</h3>
        <ul>
          <li>Subtotal: £${pricing.subtotal_before_discounts || 0}</li>
          <li>Bundle discount: -£${Math.abs(pricing.bundle_discount || 0)}</li>
          <li>Add-ons: £${pricing.addons_adjustments || 0}</li>
          <li>VAT: £${pricing.vat || 0}</li>
          <li><strong>Total (inc VAT): £${pricing.total_inc_vat || 0}</strong></li>
        </ul>
        <h3>Lead Time</h3>
        <p>${leadtime.final_lead_days || 0} business days - Target: ${leadtime.estimated_delivery_date || 'N/A'}</p>
        ${data.notes ? `<h3>Notes</h3><p>${data.notes}</p>` : ''}
        ${data.brief ? `<h3>Brief</h3><p><a href="${data.brief}">${data.brief}</a></p>` : ''}
      `
    });
    
    // Send confirmation to customer
    if (contact.email) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: contact.email,
        subject: 'NBRH - Enquiry Received',
        html: `
          <h2>Thank you for your enquiry!</h2>
          <p>Hi ${contact.name},</p>
          <p>We've received your enquiry and will be in touch soon.</p>
          <p><strong>Total estimate: £${pricing.total_inc_vat || 0}</strong></p>
          <p>Best regards,<br>NBRH Team</p>
        `
      });
    }
    
    return res.status(200).json({ status: 'success' });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
