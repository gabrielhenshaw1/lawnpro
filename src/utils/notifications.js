import emailjs from '@emailjs/browser';

/**
 * NOTIFICATION UTILITY
 * Sends real emails via EmailJS.
 * Now supports distinct templates for Customers vs. Providers.
 */

// REPLACE THESE WITH YOUR ACTUAL KEYS
const SERVICE_ID = 'service_t8mduab';
const PUBLIC_KEY = 'BJXUh2oZdZeN2YE9B';

// TEMPLATE A: For the Customer (The "Fancy" one you already made)
// Fields: {{name}} (Sender Name), {{time}}, {{message}}, {{action_link}}
const TEMPLATE_ID_CUSTOMER = 'template_6ntqybo'; 

// TEMPLATE B: For the Admin (Simple Notification)
// Fields: {{message}}, {{action_link}}
const TEMPLATE_ID_ADMIN = 'template_sy1o5jo'; 

/**
 * @param {string} toEmail - Recipient email
 * @param {string} type - 'new_request', 'quote_received', 'confirmed'
 * @param {string} link - URL to redirect to
 * @param {object} data - Dynamic data { name, servicesSummary, customerName }
 */
export const sendStatusEmail = async (toEmail, type, link, data = {}) => {
  console.log(`[EmailJS] Preparing to send to ${toEmail}...`);

  const currentTime = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let templateId = TEMPLATE_ID_CUSTOMER; // Default to customer view
  
  const emailParams = {
    to_email: toEmail,
    action_link: link,
    time: currentTime,
    name: data.name || "LawnPro Team", // Defaults to Team if no name provided
    subject: "LawnPro Update",
    message: ""
  };

  // --- LOGIC: SWITCH TEMPLATE & CONTENT ---
  switch (type) {
    // CASE 1: NOTIFYING ADMIN (Simple Template)
    case 'new_request':
      templateId = TEMPLATE_ID_ADMIN;
      emailParams.subject = "New Job Request Incoming";
      // "User sent request for: service list on date at time"
      emailParams.message = `${data.customerName || 'A user'} sent a request for:\n\n${data.servicesSummary || 'Service Details Unavailable'}\n\nPlease review in app.`;
      break;

    // CASE 2: NOTIFYING CUSTOMER (Fancy Template)
    case 'quote_received':
      templateId = TEMPLATE_ID_CUSTOMER;
      emailParams.subject = "Action Required: New Quote Received";
      emailParams.message = "I have reviewed your property and generated a quote for your request. Please click the link below to review the price and approve the service.";
      break;

    case 'confirmed':
      templateId = TEMPLATE_ID_CUSTOMER;
      emailParams.subject = "Service Confirmed";
      emailParams.message = "Good news! Your service request has been accepted. I have added you to the schedule.";
      break;

    default:
      emailParams.message = "You have a new notification regarding your account.";
  }

  // --- SEND ---
  try {
    if (SERVICE_ID === 'YOUR_SERVICE_ID') {
      console.warn("EmailJS Keys not set. Simulating email...");
      console.log("TEMPLATE USED:", templateId === TEMPLATE_ID_ADMIN ? "ADMIN_TEMPLATE" : "CUSTOMER_TEMPLATE");
      console.log("DATA SENT:", emailParams);
      return; 
    }
    
    const response = await emailjs.send(SERVICE_ID, templateId, emailParams, PUBLIC_KEY);
    console.log('[EmailJS] Success!', response.status, response.text);
  } catch (error) {
    console.error('[EmailJS] Failed:', error);
  }
};