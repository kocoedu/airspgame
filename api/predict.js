// Vercel Serverless Function: api/predict.js
// Roboflow ViT 이미지 분류 모델 연동 서버리스 함수

export default async function handler(req, res) {
    // CORS 설정 및 POST 메서드 확인
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.ROBOFLOW_API_KEY;
    const endpointUrl = process.env.ROBOFLOW_ENDPOINT;

    if (!apiKey || !endpointUrl) {
        return res.status(500).json({ 
            error: 'Server configuration error: ROBOFLOW_API_KEY or ROBOFLOW_ENDPOINT is missing.' 
        });
    }

    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Image data is required.' });
        }

        // Base64 데이터에서 헤더 접두사 제거 (data:image/jpeg;base64,)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        // Roboflow Serverless API 엔드포인트 URL 구성 (API 키 중복 방지 처리)
        let targetUrl = endpointUrl;
        if (!targetUrl.includes('api_key=')) {
            const separator = targetUrl.includes('?') ? '&' : '?';
            targetUrl = `${targetUrl}${separator}api_key=${apiKey}`;
        }

        // Roboflow API 호출 (fetch API 활용)
        const roboflowResponse = await fetch(targetUrl, {
            method: 'POST',
            body: base64Data,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!roboflowResponse.ok) {
            const errorText = await roboflowResponse.text();
            return res.status(roboflowResponse.status).json({ 
                error: 'Roboflow API error', 
                details: errorText 
            });
        }

        const result = await roboflowResponse.json();

        // 응답 파싱: predictions 배열에서 가장 높은 신뢰도를 가진 클래스 추출
        let topPrediction = null;
        if (result && result.predictions && result.predictions.length > 0) {
            // 신뢰도 기준 내림차순 정렬 후 최상위 항목 선택
            const sortedPredictions = result.predictions.sort((a, b) => b.confidence - a.confidence);
            topPrediction = sortedPredictions[0];
        }

        if (!topPrediction) {
            return res.status(200).json({ className: 'unknown', confidence: 0 });
        }

        // 결과 반환 (클래스명과 신뢰도)
        return res.status(200).json({
            className: topPrediction.class, // 예: rock, paper, scissors
            confidence: topPrediction.confidence
        });

    } catch (error) {
        console.error('Prediction processing error:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}
