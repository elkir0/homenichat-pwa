export const WHATSAPP_DEVICE_PROVIDER_ID = 'homenichat_whatsapp';
export const WHATSAPP_DEVICE_PROVIDER_TYPE = 'server_whatsapp';
export const WHATSAPP_META_PROVIDER_ID = 'meta';
export const SMS_BRIDGE_PROVIDER_ID = 'sms-bridge';

export const PROVIDER_LABELS = {
  [WHATSAPP_DEVICE_PROVIDER_ID]: 'WhatsApp (appareil lie)',
  [WHATSAPP_DEVICE_PROVIDER_TYPE]: 'WhatsApp (appareil lie)',
  [WHATSAPP_META_PROVIDER_ID]: 'WhatsApp Business',
  [SMS_BRIDGE_PROVIDER_ID]: 'SMS',
};

export const getProviderLabel = (providerId) => PROVIDER_LABELS[providerId] || providerId || 'Aucun';
