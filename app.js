// ⚠️ 請將這裡替換成你剛剛部署 GAS 取得的網頁應用程式網址
const API_URL = "https://script.google.com/macros/s/AKfycbwG4niMueHcXOg-eWSFCCR4oek4rel_tTGjRf3ZL9kGbxzuxjryvY9I1Ev6aVFcbhBM/exec"; 

let html5QrCode;

// 初始化掃描器
function startScanner() {
  document.getElementById('result-container').style.display = 'none';
  document.getElementById('rescan-btn').style.display = 'none';
  
  html5QrCode = new Html5Qrcode("reader");
  
  // 設定使用手機後置鏡頭 (environment)
  const config = { fps: 10, qrbox: { width: 250, height: 150 } };
  
  html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
      console.error("相機啟動失敗:", err);
      alert("無法啟動相機，請確認是否已給予權限。");
    });
}

// 掃描成功時的處理
function onScanSuccess(decodedText, decodedResult) {
  // 1. 停止相機掃描，避免重複觸發
  html5QrCode.stop().then(() => {
    console.log("掃描成功，停止相機。條碼:", decodedText);
    
    // 2. 顯示讀取中狀態
    document.getElementById('loading').style.display = 'block';
    
    // 3. 呼叫 GAS 後端 API
    fetchDataFromGAS(decodedText);
  }).catch(err => {
    console.error("停止相機失敗:", err);
  });
}

// 修改原本的 fetchDataFromGAS 函式
function fetchDataFromGAS(barcode) {
  const requestUrl = `${API_URL}?barcode=${encodeURIComponent(barcode)}`;
  
  // 設定 10 秒的 Timeout (可以根據需求調整)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("請求逾時"));
    }, 10000); 
  });

  // 讓 fetch 與 timeout 競賽
  Promise.race([fetch(requestUrl), timeoutPromise])
    .then(response => response.json())
    .then(result => {
      // ... 原本成功處理的邏輯 ...
      document.getElementById('loading').style.display = 'none';
      document.getElementById('rescan-btn').style.display = 'block';
      
      if (result.status === "success") {
        renderData(result.data);
      } else {
        alert(result.message || "找不到該設備資料");
      }
    })
    .catch(error => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('rescan-btn').style.display = 'block';
      
      // 根據錯誤類型給予不同提示
      if (error.message === "請求逾時") {
         alert("查詢時間過長，請確認網路收訊後，點擊「重新掃描」再試一次。");
      } else {
         console.error('API 錯誤:', error);
         alert("連線發生錯誤，請檢查網路狀態。");
      }
    });
}

// 將資料渲染到畫面上
function renderData(data) {
  const container = document.getElementById('device-info');
  container.innerHTML = ''; 
  
  // 動態產生欄位資料
  for (const [key, value] of Object.entries(data)) {
    const row = document.createElement('div');
    row.className = 'info-row';
    row.innerHTML = `<span class="info-label">${key}：</span><span>${value}</span>`;
    container.appendChild(row);
  }
  
  document.getElementById('result-container').style.display = 'block';
}

// 網頁載入後自動啟動掃描
document.addEventListener("DOMContentLoaded", () => {
  startScanner();
});