import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

if (window.Capacitor?.getPlatform() === 'ios') {
  document.documentElement.classList.add('ios-native')
  document.querySelector('meta[name="viewport"]')
    .setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
}

createApp(App).mount('#app')
