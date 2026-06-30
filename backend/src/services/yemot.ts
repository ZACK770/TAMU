import axios from 'axios';
import logger from '../utils/logger.js';

interface YemotResponse {
  responseStatus: string;
  message?: string;
  messageCode?: number | null;
  yemotAPIVersion?: string;
}

export class YemotService {
  private username: string;
  private password: string;
  private apiUrl: string;
  private token: string;

  constructor() {
    this.username = process.env.YEMOT_API_USERNAME || '';
    this.password = process.env.YEMOT_API_PASSWORD || '';
    this.apiUrl = 'https://www.call2all.co.il/ym/api/';
    // Token format: username:password (system number:management password)
    this.token = `${this.username}:${this.password}`;
  }

  private async callApi(action: string, params: Record<string, any>): Promise<YemotResponse> {
    try {
      const response = await axios.get(`${this.apiUrl}${action}`, {
        params: {
          token: this.token,
          ...params,
        },
      });

      logger.info('Yemot API call successful', { action, status: response.data.responseStatus });
      return response.data;
    } catch (error) {
      logger.error('Yemot API call failed', { action, error });
      throw new Error('Failed to call Yemot API');
    }
  }

  async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      const response = await this.callApi('SendSms', {
        phones: phone,
        message: message,
      });

      if (response.responseStatus === 'OK') {
        logger.info('SMS sent successfully', { phone });
        return true;
      }

      logger.warn('SMS sending failed', { phone, response: response.message });
      return false;
    } catch (error) {
      logger.error('SMS sending error', { phone, error });
      return false;
    }
  }

  async makeCall(phone: string, text: string): Promise<boolean> {
    try {
      const response = await this.callApi('RunTzintuk', {
        phones: phone,
        tts_message: text,
      });

      if (response.responseStatus === 'OK') {
        logger.info('Voice call initiated successfully', { phone });
        return true;
      }

      logger.warn('Voice call initiation failed', { phone, response: response.message });
      return false;
    } catch (error) {
      logger.error('Voice call error', { phone, error });
      return false;
    }
  }
}

export const yemotService = new YemotService();
