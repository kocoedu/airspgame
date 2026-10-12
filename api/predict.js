// 변경 전: 직접 Roboflow 서버 호출 (API Key 노출 위험)
// const jsonResult = await fetchWithCORSProxy(payload);

// 변경 후: Vercel 서버리스 함수 호출 (안전함)
async function predictHandGesture() {
    if (!video.videoWidth || isPredicting) return 'rock';
    isPredicting = true;

    try {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        const minDim = Math.min(vw, vh);

        canvas.width = 224;
        canvas.height = 224;

        const sx = (vw - minDim) / 2;
        const sy = (vh - minDim) / 2;

        ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 224, 224);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Vercel 서버리스 API로 이미지 전송
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl })
        });

        if (!response.ok) throw new Error('API 예측 실패');

        const result = await response.json();
        isPredicting = false;
        
        // 서버에서 파싱된 결과를 받아옴 (rock / paper / scissors)
        const detected = result.topClass;
        return GESTURE_KEYS.includes(detected) ? detected : getRandomGesture();

    } catch (e) {
        isPredicting = false;
        return getRandomGesture();
    }
}
