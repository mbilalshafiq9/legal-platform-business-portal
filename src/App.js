// src/App.js
import React ,{useEffect} from 'react';
import AppRouter from './router/index';
import WalkthroughPopup from './components/WalkthroughPopup';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'primereact/resources/themes/lara-light-cyan/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './assets/css/style.bundle.css';
import './assets/css/mobile-sidebar-animations.css';
import './assets/css/mobile-popups.css';
import './assets/css/circular-plus-icons.css';
import './assets/css/airbnb-dropdown.css';
import AOS from 'aos';
import 'aos/dist/aos.css';

function App() {



  useEffect(() => {
    document.title = process.env.REACT_APP_NAME || 'React App';
     // Update existing meta tags
     const metaDescription = document.querySelector('meta[name="description"]');
     if (metaDescription) {
         metaDescription.content = process.env.REACT_APP_DESCRIPTION || 'React App Description';
     }

     const metaKeywords = document.querySelector('meta[name="keywords"]');
     if (metaKeywords) {
        metaKeywords.content = process.env.REACT_APP_KEYWORDS || 'React App keywords';
     }

     // Initialize AOS
     AOS.init({
       duration: 800,
       easing: 'ease-in-out',
       once: true,
       offset: 100
     });

  }, []);
  return (
    <div>
      <AppRouter />      
      <ToastContainer />
      <WalkthroughPopup />      

    </div>
  );
}

export default App;
