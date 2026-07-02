import axios from 'axios';

const phone = '0527180504';

async function testVoiceCall() {
  try {
    console.log(`Sending TTS call to ${phone}...`);
    const response = await axios.post('http://localhost:9000/api/auth/send-code-voice', {
      phone
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testVoiceCall();
