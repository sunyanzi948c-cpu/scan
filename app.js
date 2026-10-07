// ⚠️ 這是您原本的 API 網址，已保留
const API_URL = "https://script.google.com/macros/s/AKfycbxpLmSQ9uhyr1JHpKTUVqbcg_kp-2ghMBEJlELd8ce5O2-yZfOatl1eRDgsQO5GtbnW/exec"; 

let html5QrCode;

// 網頁載入時，檢查上次同步時間並啟動掃描器
document.addEventListener("DOMContentLoaded", () => {
  const lastSync = localStorage.getItem("lastSyncTime");
  if (lastSync) {
    const syncTimeDiv = document.getElementById("sync-time");
    if (syncTimeDiv) syncTimeDiv.innerText = "最後同步時間：" + lastSync;
  }
  startScanner();
});

// ==========================================
// 1. 新增功能：下載整份表單並存入手機 (盤點前執行一次)
// ==========================================
function syncData() {
  const btn = document.querySelector('button[onclick="syncData()"]');
  if (btn) {
    btn.innerText = "🔄 資料下載中...";
    btn.disabled = true;
  }

  fetch(API_URL + "?action=sync")
    .then(response => response.json())
    .then(result => {
      if (result.status === "success") {
        // 將陣列轉為字串，存入瀏覽器空間 (LocalStorage)
        localStorage.setItem("deviceList", JSON.stringify(result.data));
        
        // 記錄當下時間
        const now = new Date().toLocaleString();
        localStorage.setItem("lastSyncTime", now);
        
        const syncTimeDiv = document.getElementById("sync-time");
        if (syncTimeDiv) syncTimeDiv.innerText = "最後同步時間：" + now;
        
        alert(`同步完成！共下載 ${result.data.length} 筆設備資料。\n現在您可以離線秒速掃碼了！`);
      } else {
        alert("同步失敗：" + result.message);
      }
    })
    .catch(err => {
      console.error(err);
      alert("網路連線錯誤，無法同步資料。");
    })
    .finally(() => {
      if (btn) {
        btn.innerText = "🔄 從雲端同步最新資料";
        btn.disabled = false;
      }
    });
}

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
    
    // 2. 呼叫本地搜尋函數 (取代原本的 fetchDataFromGAS)
    searchLocalData(decodedText);
  }).catch(err => {
    console.error("停止相機失敗:", err);
  });
}

// ==========================================
// 2. 新增功能：在 LocalStorage 中瞬間搜尋
// ==========================================
function searchLocalData(barcode) {
  const localDataStr = localStorage.getItem("deviceList");
  
  if (!localDataStr) {
    alert("手機內沒有資料，請先點擊上方的「從雲端同步最新資料」！");
    document.getElementById('rescan-btn').style.display = 'block';
    return;
  }

  const deviceList = JSON.parse(localDataStr);
  
  // 使用 JavaScript 內建方法在陣列中尋找符合的條碼 (瞬間完成)
  // 注意：這裡的 '設備條碼' 必須與您 Google 試算表 A1 儲存格的標題完全一致
  const foundDevice = deviceList.find(item => String(item['設備條碼']).trim() === String(barcode).trim());

  document.getElementById('rescan-btn').style.display = 'block';

  if (foundDevice) {
    renderData(foundDevice); // 找到資料，直接渲染畫面
  } else {
    alert(`資料庫中找不到該條碼 (${barcode}) 的設備資料\n(如果這是新設備，請先按同步按鈕更新資料)`);
  }
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