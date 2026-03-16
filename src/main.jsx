import { render } from 'preact'
import './index.css'
import { App } from './app.jsx'
import { initAuth } from './lib/auth.js'

initAuth().then(() => {
  render(<App />, document.getElementById('app'))
})
