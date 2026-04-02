// =============================================
// Firebase Configuration
// =============================================
// IMPORTANTE: Reemplaza los valores de abajo con los de tu proyecto Firebase.
// Puedes encontrarlos en la consola de Firebase > Configuración del proyecto.

const firebaseConfig = {
  apiKey: "AIzaSyCNo-C5SfrMZyfqLrj5DmlUt-5Uw_dR5J0",
  authDomain: "panaderia-praxedes.firebaseapp.com",
  projectId: "panaderia-praxedes",
  storageBucket: "panaderia-praxedes.firebasestorage.app",
  messagingSenderId: "827883666018",
  appId: "1:827883666018:web:27bc07bfe734fe83a96f3b",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const db   = firebase.firestore();
const auth = firebase.auth();
