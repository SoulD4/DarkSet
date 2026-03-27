const REPLICATE_TOKEN = 'r8_NrxtAXOotsknph9WEMMtDy71pZWBsR305KpzF';

export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname; // /predictions ou /predictions/:id

    const replicateUrl = `https://api.replicate.com/v1${path}`;

    const response = await fetch(replicateUrl, {
      method: request.method,
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: request.method === 'POST' ? request.body : undefined,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
