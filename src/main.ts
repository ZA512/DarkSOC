import App from './app/App.svelte';
import './app/styles.css';
import { mount } from 'svelte';

const target = document.getElementById('app');

if (!target) {
  throw new Error('Application mount target not found');
}

export default mount(App, { target });
