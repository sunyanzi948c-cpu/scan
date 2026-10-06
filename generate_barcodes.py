import os
import barcode
from barcode.writer import ImageWriter
from datetime import datetime

# 建立一個資料夾來存放產生出來的條碼圖片
output_dir = "device_barcodes"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def generate_device_barcode(category, purchase_date, seq):
    """
    category: 設備代號 (例如 'PC', 'NB', 'PR', 'SC')
    purchase_date: 採購日期字串 (例如 '2026-10-06')
    seq: 流水號 (整數，例如 1)
    """
    # 1. 將日期格式轉換為 YYMM (例如 2026-10-06 轉成 2610)
    dt = datetime.strptime(purchase_date, "%Y-%m-%d")
    yymm = dt.strftime("%y%m")
    
    # 2. 組合條碼字串，流水號使用 03d 自動補齊 3 碼 (例如 1 -> 001)
    barcode_str = f"{category}{yymm}{seq:03d}"
    
    # 3. 指定使用 Code 128 條碼格式
    CODE128 = barcode.get_barcode_class('code128')
    
    # 設定圖片的樣式 (可依需求調整大小或字體)
    writer_options = {
        'font_size': 10,        # 底下文字的大小
        'text_distance': 4.0,   # 條碼與文字的距離
        'module_height': 15.0,  # 條碼的高度
    }
    
    # 產生條碼物件
    my_barcode = CODE128(barcode_str, writer=ImageWriter())
    
    # 4. 儲存成 PNG 圖檔 (檔名就是條碼字串)
    filename = os.path.join(output_dir, barcode_str)
    # save 方法會自動在檔名後加上 .png
    my_barcode.save(filename, options=writer_options)
    
    print(f"✅ 成功產生條碼圖片：{filename}.png")

# ==========================================
# 模擬批次產生的清單 (實務上你也可以用 pandas 讀取 Excel 或 CSV)
# ==========================================
devices_to_generate = [
    {"category": "PC", "date": "2026-10-06", "seq": 1},  # 主機 1
    {"category": "PC", "date": "2026-10-06", "seq": 2},  # 主機 2
    {"category": "NB", "date": "2026-10-15", "seq": 1},  # 筆電 1
    {"category": "PR", "date": "2026-11-02", "seq": 1},  # 印表機 1
    {"category": "SC", "date": "2026-10-06", "seq": 1},  # 螢幕 1
    {"category": "SC", "date": "2026-10-06", "seq": 2},  # 螢幕 2
]

print("開始批次產生條碼...")
for device in devices_to_generate:
    generate_device_barcode(device["category"], device["date"], device["seq"])
print("🎉 所有條碼產生完畢！")