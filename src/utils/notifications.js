import emailjs from '@emailjs/browser';

/**
 * NOTIFICATION UTILITY
 * Sends real emails via EmailJS.
 * securely loads keys from .env file.
 */

// LOAD KEYS FROM ENVIRONMENT VARIABLES
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID_CUSTOMER = import.meta.env.VITE_EMAILJS_TEMPLATE_CUSTOMER;
const TEMPLATE_ID_ADMIN = import.meta.env.VITE_EMAILJS_TEMPLATE_ADMIN;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export const sendStatusEmail = async (toEmail, type, link, data = {}) => {
  console.log(`[EmailJS] Preparing to send to ${toEmail}...`);

  const currentTime = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let templateId = TEMPLATE_ID_CUSTOMER; 
  
  const emailParams = {
    to_email: toEmail,
    action_link: link,
    time: currentTime,
    name: data.name || "LawnPro Team",
    subject: "LawnPro Update",
    message: ""
  };

  switch (type) {
    case 'new_request':
      templateId = TEMPLATE_ID_ADMIN; 
      emailParams.subject = "New Job Request Incoming";
      emailParams.message = `${data.customerName || 'A user'} sent a request for:\n\n${data.servicesSummary || 'Details in app'}\n\nPlease review in app.`;
      break;

    case 'quote_received':
      emailParams.subject = "Action Required: New Quote Received";
      emailParams.message = "I have reviewed your property and generated a quote. Please click the link below to review and approve.";
      break;

    case 'confirmed':
      emailParams.subject = "Service Confirmed";
      emailParams.message = "Good news! Your service request has been accepted and scheduled.";
      break;

    case 'reschedule_proposal':
      if (data.isToAdmin) {
        templateId = TEMPLATE_ID_ADMIN;
        emailParams.subject = "Reschedule Requested";
        emailParams.message = `Customer has proposed a new time: ${data.proposedInfo}. Review in app.`;
      } else {
        templateId = TEMPLATE_ID_CUSTOMER;
        emailParams.subject = "Reschedule Proposal Received";
        emailParams.message = `We have proposed a new time for your service: ${data.proposedInfo}. Please Accept or Counter in the dashboard.`;
      }
      break;

    case 'cancelled':
      emailParams.subject = "Service Cancelled";
      emailParams.message = "This service appointment has been cancelled.";
      break;

    default:
      emailParams.message = "You have a new notification.";
  }

  try {
    // Check if keys are loaded
    if (!SERVICE_ID || !PUBLIC_KEY) {
      console.warn("[EmailJS] Missing .env keys. Email simulated.");
      console.log("DATA:", emailParams);
      return; 
    }
    
    const response = await emailjs.send(SERVICE_ID, templateId, emailParams, PUBLIC_KEY);
    console.log('[EmailJS] Sent Successfully', response.status, response.text);
  } catch (error) {
    console.error('[EmailJS] Failed:', error);
  }
};