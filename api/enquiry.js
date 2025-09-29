const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
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
    
    let basketHtml = '<ul>';
    (data.basket || []).forEach(item => {
      basketHtml += `<li><strong>${item.sub_service}</strong> (${item.core_service}) - £${item.base_price}</li>`;
    });
    basketHtml += '</ul>';
    
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
        <h3>Total</h3>
        <p><strong>£${pricing.total_inc_vat || 0}</strong></p>
        ${data.notes ? `<h3>Notes</h3><p>${data.notes}</p>` : ''}
      `
    });
    
    return res.status(200).json({ status: 'success' });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
