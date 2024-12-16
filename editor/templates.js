const TEMPLATES = {
  simple: {
    name: '简约',
    styles: {
      fontFamily: 'Arial',
      fontSize: 24,
      textColor: '#333333',
      backgroundColor: '#ffffff',
      padding: 40,
      lineHeight: 1.5,
      borderRadius: 0
    }
  },
  literary: {
    name: '文艺',
    styles: {
      fontFamily: 'Georgia',
      fontSize: 28,
      textColor: '#2c3e50',
      backgroundColor: '#f8f9fa',
      padding: 60,
      lineHeight: 1.8,
      borderRadius: 8,
      decorations: {
        quote: true,
        border: '2px solid #eee'
      }
    }
  },
  business: {
    name: '商务',
    styles: {
      fontFamily: 'Microsoft YaHei',
      fontSize: 22,
      textColor: '#1a1a1a',
      backgroundColor: '#f0f2f5',
      padding: 50,
      lineHeight: 1.6,
      borderRadius: 4,
      decorations: {
        logo: true,
        watermark: true
      }
    }
  },
  handwriting: {
    name: '手写',
    styles: {
      fontFamily: 'FZKTJW',  // 需要加载手写字体
      fontSize: 32,
      textColor: '#444444',
      backgroundColor: '#fdfbf7',
      padding: 45,
      lineHeight: 2,
      borderRadius: 0,
      decorations: {
        texture: true
      }
    }
  }
}; 