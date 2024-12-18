class ImageEditor {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.selectedText = '';
    this.settings = {
      fontSize: 24,
      lineHeight: 1.5,
      padding: 40,
      borderRadius: 0,
      fontFamily: 'Arial',
      textAlign: 'left',
      textColor: '#000000',
      backgroundColor: '#ffffff',
      decorations: {
        activeDecorations: new Set(),
        options: {
          'quote-marks': {
            color: '#EEEEEE',
            size: 72,
            position: 'top-left'
          },
          'border': {
            style: 'solid',
            width: 2,
            color: '#EEEEEE',
            radius: 0
          },
          'watermark': {
            text: 'Generated by Text2Image',
            opacity: 0.1,
            angle: -45
          },
          'texture': {
            pattern: 'lines',
            opacity: 0.1,
            scale: 1
          },
          'corner': {
            style: 'simple',
            color: '#EEEEEE',
            size: 40
          },
          'pattern': {
            type: 'dots',
            color: '#EEEEEE',
            opacity: 0.1,
            scale: 1
          }
        }
      },
      currentTemplate: 'simple',
      backgroundImage: null,
      backgroundSize: 'cover',  // 'cover' | 'contain' | 'repeat'
      backgroundOpacity: 1,
      filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0
      }
    };
    
    this.customFonts = new Map();  // 存储自定义字体
    this.history = [];
    this.loadHistory();
    this.loadCustomFonts();
    this.loadFonts();
    this.initializeCanvas();
    this.bindEvents();
    this.exportSettings = {
      format: 'png',
      quality: 0.9,
      width: 800,
      height: 600,
      maintainRatio: true
    };
  }

  async loadCustomFonts() {
    try {
      const result = await chrome.storage.local.get('customFonts');
      const storedFonts = result.customFonts || [];
      
      for (const fontData of storedFonts) {
        await this.loadFontFromData(fontData);
      }
    } catch (err) {
      console.error('加载自定义字体失败:', err);
    }
  }

  async loadFontFromData(fontData) {
    try {
      const fontFace = new FontFace(fontData.name, `url(data:font/ttf;base64,${fontData.data})`);
      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);
      this.customFonts.set(fontData.name, fontData);
      
      // 更新字体选择器
      this.updateFontSelect();
    } catch (err) {
      console.error('加载字体失败:', err);
    }
  }

  updateFontSelect() {
    const fontSelect = document.getElementById('fontSelect');
    const customFontOptions = Array.from(this.customFonts.keys()).map(fontName => 
      `<option value="${fontName}">${fontName}</option>`
    ).join('');
    
    // 保持当前选中的字体
    const currentFont = fontSelect.value;
    fontSelect.innerHTML = `
      <option value="Arial">Arial</option>
      <option value="Georgia">Georgia</option>
      <option value="Microsoft YaHei">微软雅黑</option>
      <option value="FZKTJW">方正楷体</option>
      ${customFontOptions}
    `;
    fontSelect.value = currentFont;
  }

  async loadFonts() {
    // 加载自定义字体
    const fontFaces = [
      new FontFace('FZKTJW', 'url(../assets/fonts/FZKTJW.ttf)'),
      // 可以添加更多字体
    ];
    
    try {
      const loadedFonts = await Promise.all(fontFaces.map(font => font.load()));
      loadedFonts.forEach(font => document.fonts.add(font));
    } catch (err) {
      console.error('字体加载失败:', err);
    }
  }

  applyTemplate(templateName) {
    const template = TEMPLATES[templateName];
    if (!template) return;
    
    this.settings = {
      ...this.settings,
      ...template.styles,
      currentTemplate: templateName
    };
    
    // 更新UI控件的值
    document.getElementById('fontSize').value = this.settings.fontSize;
    document.getElementById('lineHeight').value = this.settings.lineHeight;
    document.getElementById('padding').value = this.settings.padding;
    document.getElementById('borderRadius').value = this.settings.borderRadius;
    
    this.render();
  }

  initializeCanvas() {
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.ctx.fillStyle = this.settings.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  bindEvents() {
    // 监听来自content script的消息
    window.addEventListener('message', (event) => {
      if (event.data.type === 'selectedText') {
        this.selectedText = event.data.text;
        this.render();
      }
    });

    // 绑定设置变更事件
    document.getElementById('fontSize').addEventListener('input', (e) => {
      this.settings.fontSize = parseInt(e.target.value);
      this.render();
    });

    document.getElementById('lineHeight').addEventListener('input', (e) => {
      this.settings.lineHeight = parseFloat(e.target.value);
      this.render();
    });

    document.getElementById('padding').addEventListener('input', (e) => {
      this.settings.padding = parseInt(e.target.value);
      this.render();
    });

    document.getElementById('borderRadius').addEventListener('input', (e) => {
      this.settings.borderRadius = parseInt(e.target.value);
      this.render();
    });

    // 对齐方式按钮
    document.querySelectorAll('.align-buttons button').forEach(button => {
      button.addEventListener('click', () => {
        this.settings.textAlign = button.dataset.align;
        this.render();
      });
    });

    // 保存按钮
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveImage();
    });

    // 关闭按钮
    document.getElementById('closeBtn').addEventListener('click', () => {
      window.parent.postMessage({ type: 'closeEditor' }, '*');
    });

    // 模板选择事件
    document.getElementById('templateSelect').addEventListener('change', (e) => {
      this.applyTemplate(e.target.value);
    });

    // 颜色选择器事件
    document.getElementById('textColor').addEventListener('input', (e) => {
      this.settings.textColor = e.target.value;
      this.render();
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
      this.settings.backgroundColor = e.target.value;
      this.render();
    });

    // 背景图片上传
    document.getElementById('bgImageBtn').addEventListener('click', () => {
      document.getElementById('bgImageInput').click();
    });

    document.getElementById('bgImageInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadBackgroundImage(file);
      }
    });

    // 标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.querySelector(`.${btn.dataset.panel}-content`).classList.add('active');
      });
    });

    // 历史记录点击事件
    document.querySelector('.history-list').addEventListener('click', (e) => {
      const historyItem = e.target.closest('.history-item');
      if (historyItem) {
        const id = parseInt(historyItem.dataset.id);
        const item = this.history.find(h => h.id === id);
        if (item) {
          this.settings = { ...item.settings };
          this.selectedText = item.text;
          this.render();
        }
      }
    });

    // 分享按钮
    document.getElementById('shareBtn').addEventListener('click', () => {
      this.showSharePanel();
    });

    // 关闭分享面板
    document.querySelector('.close-share-btn').addEventListener('click', () => {
      document.querySelector('.share-panel').style.display = 'none';
    });

    // 分享平台按钮
    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.shareToPlaftorm(btn.dataset.platform);
      });
    });

    // 字体选择事件
    document.getElementById('fontSelect').addEventListener('change', (e) => {
      this.settings.fontFamily = e.target.value;
      this.render();
    });

    // 字体上传事件
    document.getElementById('uploadFontBtn').addEventListener('click', () => {
      document.getElementById('fontFileInput').click();
    });

    document.getElementById('fontFileInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.handleFontUpload(file);
      }
    });

    // 滤镜控制事件
    ['brightness', 'contrast', 'saturation', 'blur'].forEach(filter => {
      document.getElementById(filter).addEventListener('input', (e) => {
        this.settings.filters[filter] = parseFloat(e.target.value);
        this.render();
      });
    });

    // 滤镜预设按钮
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyFilterPreset(btn.dataset.preset);
      });
    });

    // 装饰元素点击事件
    document.querySelectorAll('.decoration-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.type;
        this.toggleDecoration(type);
      });
    });

    // 导出按钮
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.showExportPanel();
    });

    // 关闭导出面板
    document.querySelector('.close-panel-btn').addEventListener('click', () => {
      document.querySelector('.export-panel').style.display = 'none';
    });

    // 导出设置变更事件
    document.getElementById('formatSelect').addEventListener('change', (e) => {
      this.exportSettings.format = e.target.value;
      this.updateEstimatedSize();
    });

    document.getElementById('qualityRange').addEventListener('input', (e) => {
      this.exportSettings.quality = parseInt(e.target.value) / 100;
      document.querySelector('.quality-value').textContent = `${e.target.value}%`;
      this.updateEstimatedSize();
    });

    // 尺寸输入事件
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');

    widthInput.addEventListener('input', () => {
      const width = parseInt(widthInput.value);
      if (this.exportSettings.maintainRatio) {
        const ratio = this.canvas.height / this.canvas.width;
        heightInput.value = Math.round(width * ratio);
      }
      this.updateEstimatedSize();
    });

    heightInput.addEventListener('input', () => {
      const height = parseInt(heightInput.value);
      if (this.exportSettings.maintainRatio) {
        const ratio = this.canvas.width / this.canvas.height;
        widthInput.value = Math.round(height * ratio);
      }
      this.updateEstimatedSize();
    });

    // 锁定比例按钮
    document.getElementById('lockRatio').addEventListener('click', (e) => {
      this.exportSettings.maintainRatio = !this.exportSettings.maintainRatio;
      e.target.dataset.locked = this.exportSettings.maintainRatio;
      e.target.textContent = this.exportSettings.maintainRatio ? '🔒' : '🔓';
    });

    // 下载按钮
    document.getElementById('downloadBtn').addEventListener('click', () => {
      this.exportImage();
    });

    // 复制按钮
    document.getElementById('copyBtn').addEventListener('click', () => {
      this.copyToClipboard();
    });
  }

  async loadBackgroundImage(file) {
    try {
      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      
      image.onload = () => {
        this.settings.backgroundImage = image;
        URL.revokeObjectURL(imageUrl);
        this.render();
      };
      
      image.src = imageUrl;
    } catch (err) {
      console.error('背景图片加载失败:', err);
    }
  }

  render() {
    // 清空画布
    this.ctx.fillStyle = this.settings.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制背景图片
    if (this.settings.backgroundImage) {
      this.renderBackgroundImage();
    }

    // 绘制背景装饰
    if (this.settings.decorations) {
      this.renderDecorations();
    }

    // 设置文字样式
    this.ctx.font = `${this.settings.fontSize}px ${this.settings.fontFamily}`;
    this.ctx.fillStyle = this.settings.textColor;
    this.ctx.textAlign = this.settings.textAlign;

    // 文字换行处理
    const maxWidth = this.canvas.width - (this.settings.padding * 2);
    const text = this.selectedText;
    let lines = [];
    
    // 计算每行能容纳的字符数
    let start = 0;
    while (start < text.length) {
      let end = start;
      let lastBreak = start;
      
      while (end < text.length) {
        const testLine = text.slice(start, end + 1);
        const metrics = this.ctx.measureText(testLine);
        
        if (metrics.width > maxWidth) {
          break;
        }
        
        if (text[end] === '\n') {
          lastBreak = end;
          break;
        } else if (text[end] === ' ' || text[end] === '，' || 
                  text[end] === '。' || text[end] === '；' ||
                  text[end] === '！' || text[end] === '？') {
          lastBreak = end;
        }
        end++;
      }
      
      if (lastBreak === start && end < text.length) {
        // 如果没有找到合适的断点，强制断行
        lastBreak = end - 1;
      }
      
      lines.push(text.slice(start, lastBreak + 1));
      start = lastBreak + 1;
    }
    
    // 计算文本总高度
    const lineHeight = this.settings.fontSize * this.settings.lineHeight;
    const totalHeight = lines.length * lineHeight;
    
    // 计算起始Y坐标以实现垂直居中
    let y = (this.canvas.height - totalHeight) / 2;

    // 绘制文字
    lines.forEach((line) => {
      let x;
      switch(this.settings.textAlign) {
        case 'center':
          x = this.canvas.width / 2;
          break;
        case 'right':
          x = this.canvas.width - this.settings.padding;
          break;
        default:
          x = this.settings.padding;
      }
      
      this.ctx.fillText(line.trim(), x, y);
      y += lineHeight;
    });

    // 应用滤镜效果
    this.applyFilters();
  }

  renderDecorations() {
    const { decorations } = this.settings;
    const { activeDecorations, options } = decorations;
    
    if (activeDecorations.has('quote-marks')) {
      const opts = options['quote-marks'];
      this.ctx.font = `${opts.size}px Georgia`;
      this.ctx.fillStyle = opts.color;
      this.ctx.fillText('"', 30, 80);
    }
    
    if (activeDecorations.has('border')) {
      const opts = options.border;
      this.ctx.strokeStyle = opts.color;
      this.ctx.lineWidth = opts.width;
      this.ctx.strokeRect(20, 20, 
        this.canvas.width - 40, 
        this.canvas.height - 40);
    }
    
    if (activeDecorations.has('watermark')) {
      this.ctx.font = '14px Arial';
      this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
      this.ctx.save();
      this.ctx.rotate(-Math.PI / 4);
      this.ctx.fillText('Generated by Text2Image', -50, 400);
      this.ctx.restore();
    }
    
    if (activeDecorations.has('texture')) {
      const pattern = this.ctx.createPattern(this.getTextureImage(), 'repeat');
      this.ctx.fillStyle = pattern;
      this.ctx.globalAlpha = 0.1;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalAlpha = 1;
    }
    
    if (activeDecorations.has('corner')) {
      this.renderCorners(options.corner);
    }
    
    if (activeDecorations.has('pattern')) {
      this.renderPattern(options.pattern);
    }
  }

  getTextureImage() {
    // 创建纹理图片（这里用简单的canvas生成，实际项目中可以使用图片文件）
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 20;
    textureCanvas.height = 20;
    const txtCtx = textureCanvas.getContext('2d');
    txtCtx.strokeStyle = '#000';
    txtCtx.lineWidth = 0.5;
    txtCtx.beginPath();
    txtCtx.moveTo(0, 0);
    txtCtx.lineTo(20, 20);
    txtCtx.stroke();
    return textureCanvas;
  }

  saveImage() {
    const imageUrl = this.canvas.toDataURL('image/png');
    this.saveToHistory();
    chrome.runtime.sendMessage({
      action: 'saveImage',
      imageUrl: imageUrl
    });
  }

  renderBackgroundImage() {
    const { backgroundImage, backgroundSize, backgroundOpacity } = this.settings;
    
    this.ctx.save();
    this.ctx.globalAlpha = backgroundOpacity;
    
    if (backgroundSize === 'cover') {
      const scale = Math.max(
        this.canvas.width / backgroundImage.width,
        this.canvas.height / backgroundImage.height
      );
      const w = backgroundImage.width * scale;
      const h = backgroundImage.height * scale;
      const x = (this.canvas.width - w) / 2;
      const y = (this.canvas.height - h) / 2;
      
      this.ctx.drawImage(backgroundImage, x, y, w, h);
    } else if (backgroundSize === 'contain') {
      const scale = Math.min(
        this.canvas.width / backgroundImage.width,
        this.canvas.height / backgroundImage.height
      );
      const w = backgroundImage.width * scale;
      const h = backgroundImage.height * scale;
      const x = (this.canvas.width - w) / 2;
      const y = (this.canvas.height - h) / 2;
      
      this.ctx.drawImage(backgroundImage, x, y, w, h);
    } else if (backgroundSize === 'repeat') {
      const pattern = this.ctx.createPattern(backgroundImage, 'repeat');
      this.ctx.fillStyle = pattern;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    this.ctx.restore();
  }

  async loadHistory() {
    try {
      const result = await chrome.storage.local.get('imageHistory');
      this.history = result.imageHistory || [];
      this.renderHistory();
    } catch (err) {
      console.error('加载历史记录失败:', err);
    }
  }

  async saveToHistory() {
    const imageData = {
      id: Date.now(),
      preview: this.canvas.toDataURL('image/png'),
      settings: { ...this.settings },
      text: this.selectedText,
      timestamp: new Date().toISOString()
    };

    this.history.unshift(imageData);
    if (this.history.length > 10) {
      this.history.pop();
    }

    try {
      await chrome.storage.local.set({ imageHistory: this.history });
      this.renderHistory();
    } catch (err) {
      console.error('保存历史记录失败:', err);
    }
  }

  renderHistory() {
    const historyList = document.querySelector('.history-list');
    historyList.innerHTML = this.history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <img src="${item.preview}" alt="历史记录">
        <div class="history-info">
          <div class="history-text">${item.text.slice(0, 50)}...</div>
          <div class="history-time">${new Date(item.timestamp).toLocaleString()}</div>
        </div>
      </div>
    `).join('');
  }

  async showSharePanel() {
    const sharePanel = document.querySelector('.share-panel');
    sharePanel.style.display = 'block';
    
    // 生成分享链接
    const imageUrl = this.canvas.toDataURL('image/png');
    const shareLink = await this.uploadImage(imageUrl);
    document.getElementById('shareLink').value = shareLink;
  }

  async uploadImage(imageUrl) {
    // 这里应该实现图片上传到服务器的逻辑
    // 返回可访问的URL
    return 'https://example.com/shared-image/123';
  }

  shareToPlaftorm(platform) {
    const shareUrl = document.getElementById('shareLink').value;
    const text = encodeURIComponent('分享一张精美的文字图片');
    
    let url;
    switch (platform) {
      case 'weibo':
        url = `http://service.weibo.com/share/share.php?url=${shareUrl}&title=${text}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`;
        break;
      case 'wechat':
        // 微信分享需要调用微信 JS-SDK，这里简化处理
        alert('请使用微信扫描二维码分享');
        return;
    }
    
    window.open(url, '_blank');
  }

  async handleFontUpload(file) {
    try {
      // 读取字体文件
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fontData = e.target.result.split(',')[1]; // 获取base64数据
        const fontName = file.name.replace(/\.[^/.]+$/, ""); // 移除扩展名
        
        // 创建字体对象
        const fontFace = new FontFace(fontName, `url(data:font/ttf;base64,${fontData})`);
        
        try {
          // 加载字体
          const loadedFont = await fontFace.load();
          document.fonts.add(loadedFont);
          
          // 保存字体数据
          this.customFonts.set(fontName, { name: fontName, data: fontData });
          
          // 更新存储
          await chrome.storage.local.set({
            customFonts: Array.from(this.customFonts.values())
          });
          
          // 更新字体选择器
          this.updateFontSelect();
          
          // 应用新字体
          this.settings.fontFamily = fontName;
          this.render();
        } catch (err) {
          console.error('字体加载失败:', err);
          alert('字体文件无效或不支持');
        }
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('字体上传失败:', err);
      alert('字体上传失败');
    }
  }

  applyFilterPreset(preset) {
    const presets = {
      none: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0
      },
      warm: {
        brightness: 110,
        contrast: 110,
        saturation: 120,
        blur: 0,
        colorOverlay: 'rgba(255, 150, 0, 0.1)'
      },
      cool: {
        brightness: 100,
        contrast: 105,
        saturation: 90,
        blur: 0,
        colorOverlay: 'rgba(0, 150, 255, 0.1)'
      },
      vintage: {
        brightness: 90,
        contrast: 120,
        saturation: 80,
        blur: 0.5,
        sepia: true
      }
    };

    this.settings.filters = { ...presets[preset] };
    this.updateFilterControls();
    this.render();
  }

  updateFilterControls() {
    Object.entries(this.settings.filters).forEach(([filter, value]) => {
      const control = document.getElementById(filter);
      if (control) {
        control.value = value;
      }
    });
  }

  applyFilters() {
    const { filters } = this.settings;
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // 应用亮度、对比度和饱和度
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 亮度
      const brightness = filters.brightness / 100;
      r *= brightness;
      g *= brightness;
      b *= brightness;

      // 对比度
      const contrast = filters.contrast / 100;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      r = factor * (r - 128) + 128;
      g = factor * (g - 128) + 128;
      b = factor * (b - 128) + 128;

      // 饱和度
      const saturation = filters.saturation / 100;
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      r = gray + saturation * (r - gray);
      g = gray + saturation * (g - gray);
      b = gray + saturation * (b - gray);

      // 确保颜色值在有效范围内
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    // 应用模糊效果
    if (filters.blur > 0) {
      this.applyBlur(imageData, filters.blur);
    }

    // 应用特殊效果
    if (filters.sepia) {
      this.applySepia(data);
    }

    this.ctx.putImageData(imageData, 0, 0);

    // 应用颜色叠加
    if (filters.colorOverlay) {
      this.ctx.fillStyle = filters.colorOverlay;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  applyBlur(imageData, radius) {
    // 简单的方框模糊实现
    const width = this.canvas.width;
    const height = this.canvas.height;
    const data = imageData.data;
    const copy = new Uint8ClampedArray(data);

    const boxSize = Math.floor(radius);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;

        for (let dy = -boxSize; dy <= boxSize; dy++) {
          for (let dx = -boxSize; dx <= boxSize; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const i = (py * width + px) * 4;
              r += copy[i];
              g += copy[i + 1];
              b += copy[i + 2];
              a += copy[i + 3];
              count++;
            }
          }
        }

        const i = (y * width + x) * 4;
        data[i] = r / count;
        data[i + 1] = g / count;
        data[i + 2] = b / count;
        data[i + 3] = a / count;
      }
    }
  }

  applySepia(data) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
      data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
      data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
    }
  }

  toggleDecoration(type) {
    const { activeDecorations } = this.settings.decorations;
    if (activeDecorations.has(type)) {
      activeDecorations.delete(type);
      document.querySelector(`[data-type="${type}"]`).classList.remove('active');
    } else {
      activeDecorations.add(type);
      document.querySelector(`[data-type="${type}"]`).classList.add('active');
      this.showDecorationOptions(type);
    }
    this.render();
  }

  showDecorationOptions(type) {
    const options = this.settings.decorations.options[type];
    const optionsPanel = document.querySelector('.decoration-options');
    
    let html = '';
    switch (type) {
      case 'quote-marks':
        html = this.getQuoteOptionsHTML(options);
        break;
      case 'border':
        html = this.getBorderOptionsHTML(options);
        break;
      case 'watermark':
        html = this.getWatermarkOptionsHTML(options);
        break;
      case 'texture':
        html = this.getTextureOptionsHTML(options);
        break;
      case 'corner':
        html = this.getCornerOptionsHTML(options);
        break;
      case 'pattern':
        html = this.getPatternOptionsHTML(options);
        break;
    }
    
    optionsPanel.innerHTML = html;
    optionsPanel.style.display = 'block';
    this.bindDecorationOptions(type);
  }

  getQuoteOptionsHTML(options) {
    return `
      <div class="decoration-option">
        <label>颜色</label>
        <input type="color" value="${options.color}" data-option="color">
      </div>
      <div class="decoration-option">
        <label>大小</label>
        <input type="range" min="36" max="120" value="${options.size}" data-option="size">
      </div>
      <div class="decoration-option">
        <label>位置</label>
        <select data-option="position">
          <option value="top-left" ${options.position === 'top-left' ? 'selected' : ''}>左上</option>
          <option value="top-right" ${options.position === 'top-right' ? 'selected' : ''}>右上</option>
          <option value="bottom-left" ${options.position === 'bottom-left' ? 'selected' : ''}>左下</option>
          <option value="bottom-right" ${options.position === 'bottom-right' ? 'selected' : ''}>右下</option>
        </select>
      </div>
    `;
  }

  getBorderOptionsHTML(options) {
    return `
      <div class="decoration-option">
        <label>样式</label>
        <select data-option="style">
          <option value="solid" ${options.style === 'solid' ? 'selected' : ''}>实线</option>
          <option value="dashed" ${options.style === 'dashed' ? 'selected' : ''}>虚线</option>
          <option value="double" ${options.style === 'double' ? 'selected' : ''}>双线</option>
        </select>
      </div>
      <div class="decoration-option">
        <label>颜色</label>
        <input type="color" value="${options.color}" data-option="color">
      </div>
      <div class="decoration-option">
        <label>宽度</label>
        <input type="range" min="1" max="10" value="${options.width}" data-option="width">
      </div>
      <div class="decoration-option">
        <label>圆角</label>
        <input type="range" min="0" max="50" value="${options.radius}" data-option="radius">
      </div>
    `;
  }

  getWatermarkOptionsHTML(options) {
    return `
      <div class="decoration-option">
        <label>文字</label>
        <input type="text" value="${options.text}" data-option="text">
      </div>
      <div class="decoration-option">
        <label>透明度</label>
        <input type="range" min="0" max="100" value="${options.opacity * 100}" data-option="opacity">
      </div>
      <div class="decoration-option">
        <label>角度</label>
        <input type="range" min="-180" max="180" value="${options.angle}" data-option="angle">
      </div>
    `;
  }

  getTextureOptionsHTML(options) {
    return `
      <div class="decoration-option">
        <label>图案</label>
        <select data-option="pattern">
          <option value="lines" ${options.pattern === 'lines' ? 'selected' : ''}>线条</option>
          <option value="dots" ${options.pattern === 'dots' ? 'selected' : ''}>圆点</option>
          <option value="grid" ${options.pattern === 'grid' ? 'selected' : ''}>网格</option>
        </select>
      </div>
      <div class="decoration-option">
        <label>透明度</label>
        <input type="range" min="0" max="100" value="${options.opacity * 100}" data-option="opacity">
      </div>
      <div class="decoration-option">
        <label>缩放</label>
        <input type="range" min="0.5" max="2" step="0.1" value="${options.scale}" data-option="scale">
      </div>
    `;
  }

  getCornerOptionsHTML(options) {
    return `
      <div class="decoration-option">
        <label>样式</label>
        <select data-option="style">
          <option value="simple" ${options.style === 'simple' ? 'selected' : ''}>简约</option>
          <option value="ornate" ${options.style === 'ornate' ? 'selected' : ''}>华丽</option>
          <option value="floral" ${options.style === 'floral' ? 'selected' : ''}>花纹</option>
        </select>
      </div>
      <div class="decoration-option">
        <label>颜色</label>
        <input type="color" value="${options.color}" data-option="color">
      </div>
      <div class="decoration-option">
        <label>大小</label>
        <input type="range" min="20" max="100" value="${options.size}" data-option="size">
      </div>
    `;
  }

  getPatternOptionsHTML(options) {
    return `
      <div class="decoration-option">
        <label>类型</label>
        <select data-option="type">
          <option value="dots" ${options.type === 'dots' ? 'selected' : ''}>圆点</option>
          <option value="crosses" ${options.type === 'crosses' ? 'selected' : ''}>十字</option>
          <option value="stars" ${options.type === 'stars' ? 'selected' : ''}>星形</option>
        </select>
      </div>
      <div class="decoration-option">
        <label>颜色</label>
        <input type="color" value="${options.color}" data-option="color">
      </div>
      <div class="decoration-option">
        <label>透明度</label>
        <input type="range" min="0" max="100" value="${options.opacity * 100}" data-option="opacity">
      </div>
      <div class="decoration-option">
        <label>缩放</label>
        <input type="range" min="0.5" max="2" step="0.1" value="${options.scale}" data-option="scale">
      </div>
    `;
  }

  bindDecorationOptions(type) {
    const optionsPanel = document.querySelector('.decoration-options');
    optionsPanel.querySelectorAll('[data-option]').forEach(input => {
      input.addEventListener('input', (e) => {
        const option = e.target.dataset.option;
        const value = e.target.type === 'range' ? parseInt(e.target.value) : e.target.value;
        this.settings.decorations.options[type][option] = value;
        this.render();
      });
    });
  }

  showExportPanel() {
    const panel = document.querySelector('.export-panel');
    panel.style.display = 'block';

    // 初始化输入值
    document.getElementById('widthInput').value = this.canvas.width;
    document.getElementById('heightInput').value = this.canvas.height;
    this.updateEstimatedSize();
  }

  updateEstimatedSize() {
    const width = parseInt(document.getElementById('widthInput').value) || this.canvas.width;
    const height = parseInt(document.getElementById('heightInput').value) || this.canvas.height;
    const format = this.exportSettings.format;
    const quality = this.exportSettings.quality;

    // 估算文件大小（这是一个粗略的估算）
    let bitsPerPixel;
    switch (format) {
      case 'png':
        bitsPerPixel = 32;
        break;
      case 'jpeg':
        bitsPerPixel = 24 * quality;
        break;
      case 'webp':
        bitsPerPixel = 16 * quality;
        break;
    }

    const estimatedBytes = (width * height * bitsPerPixel) / 8;
    const estimatedMB = (estimatedBytes / (1024 * 1024)).toFixed(1);
    document.getElementById('estimatedSize').textContent = estimatedMB;
  }

  async exportImage() {
    const { format, quality, width, height } = this.exportSettings;

    // 创建临时画布进行缩放
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    // 应用平滑缩放
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';

    // 绘制缩放后的图像
    tempCtx.drawImage(this.canvas, 0, 0, width, height);

    // 导出图片
    const mimeType = `image/${format}`;
    const imageUrl = tempCanvas.toDataURL(mimeType, quality);

    // 创建下载链接
    const link = document.createElement('a');
    link.download = `image-${Date.now()}.${format}`;
    link.href = imageUrl;
    link.click();
  }

  async copyToClipboard() {
    try {
      const blob = await new Promise(resolve => {
        this.canvas.toBlob(resolve, `image/${this.exportSettings.format}`, this.exportSettings.quality);
      });

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);

      alert('图片已复制到剪贴板');
    } catch (err) {
      console.error('复制到剪贴板失败:', err);
      alert('复制失败，请检查浏览器权限设置');
    }
  }

  renderCorners(options) {
    const { size, color, style } = options;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    
    // 绘制四个角
    const corners = [
      [0, 0, 1, 1],  // 左上
      [this.canvas.width, 0, -1, 1],  // 右上
      [0, this.canvas.height, 1, -1],  // 左下
      [this.canvas.width, this.canvas.height, -1, -1]  // 右下
    ];
    
    corners.forEach(([x, y, dx, dy]) => {
      if (style === 'simple') {
        this.drawSimpleCorner(x, y, size, dx, dy);
      } else if (style === 'ornate') {
        this.drawOrnateCorner(x, y, size, dx, dy);
      } else if (style === 'floral') {
        this.drawFloralCorner(x, y, size, dx, dy);
      }
    });
  }

  drawSimpleCorner(x, y, size, dx, dy) {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + (size * dx), y);
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x, y + (size * dy));
    this.ctx.stroke();
  }

  drawOrnateCorner(x, y, size, dx, dy) {
    const curve = size * 0.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    
    // 绘制曲线装饰
    if (dx > 0 && dy > 0) { // 左上角
      this.ctx.bezierCurveTo(
        x + curve, y,
        x + size, y + curve,
        x + size, y + size
      );
      this.ctx.moveTo(x, y);
      this.ctx.bezierCurveTo(
        x, y + curve,
        x + curve, y + size,
        x + size, y + size
      );
    } else {
      // 类似地处理其他角落
      // 根据 dx 和 dy 的符号调整曲线控制点
      const cx = x + (curve * dx);
      const cy = y + (curve * dy);
      this.ctx.bezierCurveTo(
        cx, y,
        x + (size * dx), cy,
        x + (size * dx), y + (size * dy)
      );
      this.ctx.moveTo(x, y);
      this.ctx.bezierCurveTo(
        x, cy,
        cx, y + (size * dy),
        x + (size * dx), y + (size * dy)
      );
    }
    
    this.ctx.stroke();
  }

  drawFloralCorner(x, y, size, dx, dy) {
    const petal = size * 0.3;
    this.ctx.save();
    this.ctx.translate(x, y);
    
    // 根据角落位置旋转画布
    if (dx < 0 && dy < 0) this.ctx.rotate(Math.PI);
    else if (dx < 0) this.ctx.rotate(Math.PI / 2);
    else if (dy < 0) this.ctx.rotate(-Math.PI / 2);
    
    // 绘制花纹
    this.ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI / 4);
      const x1 = Math.cos(angle) * petal;
      const y1 = Math.sin(angle) * petal;
      const x2 = Math.cos(angle + Math.PI/8) * size;
      const y2 = Math.sin(angle + Math.PI/8) * size;
      
      this.ctx.moveTo(0, 0);
      this.ctx.quadraticCurveTo(x1, y1, x2, y2);
    }
    this.ctx.stroke();
    
    // 添加小圆点装饰
    this.ctx.beginPath();
    this.ctx.arc(petal, petal, 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  renderPattern(options) {
    const { type, color, opacity, scale } = options;
    const pattern = this.createPattern(type, color, scale);
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = pattern;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  createPattern(type, color, scale) {
    const patternCanvas = document.createElement('canvas');
    const size = 20 * scale;
    patternCanvas.width = size;
    patternCanvas.height = size;
    const ctx = patternCanvas.getContext('2d');
    
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    
    switch (type) {
      case 'dots':
        this.drawDotsPattern(ctx, size);
        break;
      case 'crosses':
        this.drawCrossesPattern(ctx, size);
        break;
      case 'stars':
        this.drawStarsPattern(ctx, size);
        break;
    }
    
    return this.ctx.createPattern(patternCanvas, 'repeat');
  }

  drawDotsPattern(ctx, size) {
    const radius = size * 0.15;
    ctx.beginPath();
    ctx.arc(size/2, size/2, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 添加四个小点
    const smallRadius = radius * 0.5;
    [[0, 0], [0, size], [size, 0], [size, size]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, smallRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawCrossesPattern(ctx, size) {
    const lineWidth = size * 0.1;
    const length = size * 0.4;
    
    // 中心十字
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(size/2, size/2 - length/2);
    ctx.lineTo(size/2, size/2 + length/2);
    ctx.moveTo(size/2 - length/2, size/2);
    ctx.lineTo(size/2 + length/2, size/2);
    ctx.stroke();
    
    // 角落小十字
    const smallLength = length * 0.6;
    [[0, 0], [0, size], [size, 0], [size, size]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(x, y - smallLength/2);
      ctx.lineTo(x, y + smallLength/2);
      ctx.moveTo(x - smallLength/2, y);
      ctx.lineTo(x + smallLength/2, y);
      ctx.stroke();
    });
  }

  drawStarsPattern(ctx, size) {
    // 中心大星星
    this.drawStar(ctx, size/2, size/2, 5, size * 0.25, size * 0.1);
    
    // 角落小星星
    const smallSize = size * 0.15;
    [[0, 0], [0, size], [size, 0], [size, size]].forEach(([x, y]) => {
      this.drawStar(ctx, x, y, 5, smallSize, smallSize * 0.4);
    });
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for(let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}

// 初始化编辑器
window.addEventListener('DOMContentLoaded', () => {
  new ImageEditor();
}); 