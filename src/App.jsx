import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
// Import other pages later when created
import Profile from './pages/Profile';
import CreateAd from './pages/CreateAd';
import AdDetails from './pages/AdDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import EditProfile from './pages/EditProfile';
import Plans from './pages/Plans';
import MyAds from './pages/MyAds';
import MyApplications from './pages/MyApplications';
import PublicProfile from './pages/PublicProfile';
import ManageAdApplications from './pages/ManageAdApplications';
import PrivateRoute from './components/PrivateRoute';
import Footer from './components/Footer';
import ModeratorLogin from './pages/ModeratorLogin';
import ModerationPanel from './pages/ModerationPanel';

// Import other pages later when created

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
        <Routes>
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/profile/edit" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
          <Route path="/create-ad" element={<PrivateRoute><CreateAd /></PrivateRoute>} />
          <Route path="/ad/:id" element={<PrivateRoute><AdDetails /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/plans" element={<PrivateRoute><Plans /></PrivateRoute>} />
          <Route path="/my-ads" element={<PrivateRoute><MyAds /></PrivateRoute>} />
          <Route path="/my-ads/manage/:id" element={<PrivateRoute><ManageAdApplications /></PrivateRoute>} />
          <Route path="/my-applications" element={<PrivateRoute><MyApplications /></PrivateRoute>} />
          <Route path="/user/:id" element={<PrivateRoute><PublicProfile /></PrivateRoute>} />
          <Route path="/moderator-login" element={<ModeratorLogin />} />
          <Route path="/moderation-panel" element={<ModerationPanel />} />
        </Routes>
      </div>
      <Footer />
    </Router>
  );
}

export default App;
