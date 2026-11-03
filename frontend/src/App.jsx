import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('campus_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getStoredUser = () => {
  const raw = localStorage.getItem('campus_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

function App() {
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(localStorage.getItem('campus_token'));

  const saveSession = (userData, authToken) => {
    localStorage.setItem('campus_user', JSON.stringify(userData));
    localStorage.setItem('campus_token', authToken);
    setUser(userData);
    setToken(authToken);
  };

  const clearSession = () => {
    localStorage.removeItem('campus_user');
    localStorage.removeItem('campus_token');
    setUser(null);
    setToken(null);
  };

  const login = async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password });
    saveSession(response.data.user, response.data.token);
    return response.data;
  };

  const register = async ({ fullName, email, password }) => {
    const response = await api.post('/auth/register', { fullName, email, password });
    saveSession(response.data.user, response.data.token);
    return response.data;
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout request failed', error);
    } finally {
      clearSession();
    }
  };

  return (
    <BrowserRouter>
      <AppLayout user={user} onLogout={logout} />
      <Routes>
        <Route path="/" element={<LandingPage user={user} />} />
        <Route path="/register" element={<RegisterPage onRegister={register} user={user} />} />
        <Route path="/login" element={<LoginPage onLogin={login} user={user} />} />
        <Route path="/services" element={<BrowseServicesPage user={user} />} />
        <Route path="/services/:id" element={<ServiceDetailsPage user={user} />} />
        <Route path="/dashboard" element={<StudentDashboard user={user} />} />
        <Route path="/bookings" element={<MyBookingsPage user={user} />} />
        <Route path="/admin" element={<AdminDashboard user={user} />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppLayout({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate('/');
  };

  const studentLinks = [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Browse Services' },
    { to: '/dashboard', label: 'Student Dashboard' },
    { to: '/bookings', label: 'My Bookings' },
  ];

  const adminLinks = [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/admin', label: 'Admin Dashboard' },
  ];

  const links = user?.role === 'admin' ? adminLinks : studentLinks;

  return (
    <nav className="topbar">
      <div className="brand-box">
        <span className="brand-mark">CS</span>
        <div>
          <h3>Campus Service Booking</h3>
        </div>
      </div>
      <div className="nav-links">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {link.label}
          </NavLink>
        ))}
      </div>
      <div className="nav-actions">
        {!user ? (
          <>
            <NavLink to="/login" className="nav-button secondary">Login</NavLink>
            <NavLink to="/register" className="nav-button primary">Register</NavLink>
          </>
        ) : (
          <>
            <span className="welcome-tag">Hi, {user.full_name || user.email}</span>
            <button type="button" className="nav-button secondary" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}

function LandingPage({ user }) {
  const stats = useMemo(
    () => [
      { label: 'Active services', value: 12 },
      { label: 'Student bookings', value: 480 },
      { label: 'Booking slots', value: 34 },
    ],
    []
  );

  return (
    <div className="page-shell">
      <section className="hero-section">
        <div>
          <span className="eyebrow">University support made simple</span>
          <h1>Book campus support services in minutes.</h1>
          <p>
            Manage library support, wellbeing visits, career guidance, sports loans and student services using one secure platform.
          </p>
          <div className="cta-row">
            {!user ? (
              <>
                <NavLink to="/register" className="cta primary">Register</NavLink>
                <NavLink to="/login" className="cta secondary">Login</NavLink>
              </>
            ) : (
              <NavLink to={user.role === 'admin' ? '/admin' : '/dashboard'} className="cta primary">
                Go to dashboard
              </NavLink>
            )}
          </div>
        </div>
        <div className="hero-card">
          <h3>Today’s highlights</h3>
          <ul>
            <li>Career clinic appointments available</li>
            <li>Wellness slots open this week</li>
            <li>Sports equipment loans ready</li>
          </ul>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <h4>Student access</h4>
          <p>Browse active services, check availability and reserve slots without delays.</p>
        </div>
        <div className="feature-card">
          <h4>Admin control</h4>
          <p>Track bookings, update statuses and manage service capacity from one panel.</p>
        </div>
        <div className="feature-card">
          <h4>Reliable booking</h4>
          <p>Capacity checks and booking validation prevent conflicts and overbooking.</p>
        </div>
      </section>
    </div>
  );
}

function RegisterPage({ onRegister, user }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setError('');
      await onRegister(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while registering.');
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Register</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Full name
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button type="submit" className="cta primary">Create account</button>
      </form>
    </div>
  );
}

function LoginPage({ onLogin, user }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin' : '/dashboard');
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setError('');
      const response = await onLogin(form);
      if (response.user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Student or Admin Login</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button type="submit" className="cta primary">Login</button>
      </form>
    </div>
  );
}

function BrowseServicesPage({ user }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await api.get('/services');
        setServices(response.data.services || []);
      } catch (error) {
        console.error('Failed to load services', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (loading) return <div className="page-shell"><p>Loading services...</p></div>;

  return (
    <div className="page-shell">
      <h2>Campus services</h2>
      <div className="service-grid">
        {services.length === 0 ? (
          <div className="empty-state">No services are currently available.</div>
        ) : (
          services.map((service) => (
            <div className="service-card" key={service.service_id}>
              <h3>{service.service_name}</h3>
              <p>{service.description}</p>
              <div className="meta-row">
                <span>{service.location}</span>
                <span>{service.opening_time} - {service.closing_time}</span>
              </div>
              <NavLink to={`/services/${service.service_id}`} className="cta secondary">View details</NavLink>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ServiceDetailsPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadService = async () => {
      try {
        if (!user) {
          navigate('/login');
          return;
        }
        const response = await api.get(`/services/${id}`);
        setService(response.data.service);
        setSlots(response.data.slots || []);
      } catch (error) {
        console.error('Failed to load service details', error);
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [id, user, navigate]);

  const bookSlot = async () => {
    if (!selectedSlot) {
      setMessage('Please select a slot before booking.');
      return;
    }

    try {
      const response = await api.post('/bookings', { serviceId: Number(id), slotId: Number(selectedSlot) });
      setMessage('Booking successful.');
      setSelectedSlot('');
      const updated = await api.get(`/services/${id}`);
      setSlots(updated.data.slots || []);
      navigate('/bookings');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to book this slot.');
    }
  };

  if (loading) return <div className="page-shell"><p>Loading service details...</p></div>;
  if (!service) return <div className="page-shell"><p>Service not found.</p></div>;

  return (
    <div className="page-shell detail-page">
      <div className="detail-header">
        <div>
          <h2>{service.service_name}</h2>
          <p>{service.description}</p>
        </div>
        <span className="status-pill">{service.status}</span>
      </div>
      <div className="detail-meta">
        <span>Location: {service.location}</span>
        <span>Hours: {service.opening_time} - {service.closing_time}</span>
      </div>
      <p><strong>Booking rules:</strong> {service.booking_rules}</p>

      <div className="slot-box">
        {slots.length === 0 ? (
          <div className="empty-state">No booking slots are currently available.</div>
        ) : (
          <>
            <h3>Available slots</h3>
            <div className="slot-list">
              {slots.map((slot) => (
                <div className="slot-card" key={slot.slot_id}>
                  <div>
                    <strong>{slot.slot_date}</strong>
                    <p>{slot.start_time} - {slot.end_time}</p>
                  </div>
                  <div>
                    <span>{slot.remaining_capacity} seats left</span>
                    <button type="button" className="cta primary" onClick={() => setSelectedSlot(slot.slot_id)}>
                      Select slot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {selectedSlot && (
          <div className="booking-actions">
            <button className="cta primary" onClick={bookSlot}>Confirm booking</button>
          </div>
        )}
        {message && <div className="alert alert-info">{message}</div>}
      </div>
    </div>
  );
}

function StudentDashboard({ user }) {
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [serviceResponse, bookingResponse] = await Promise.all([
          api.get('/services'),
          api.get('/bookings/me'),
        ]);
        setServices(serviceResponse.data.services || []);
        setBookings(bookingResponse.data.bookings || []);
      } catch (error) {
        console.error('Failed to load student dashboard.', error);
      }
    };

    if (user) loadData();
  }, [user]);

  if (!user) return <div className="page-shell"><p>Please login to access your dashboard.</p></div>;

  return (
    <div className="page-shell">
      <h2>Student dashboard</h2>
      <div className="stats-grid dashboard-stats">
        <div className="stat-card"><strong>{services.length}</strong><span>Active services</span></div>
        <div className="stat-card"><strong>{bookings.length}</strong><span>My bookings</span></div>
      </div>

      <div className="panel-grid">
        <div className="panel-card">
          <h3>Available services</h3>
          <ul className="list-plain">
            {services.length === 0 ? <li>No active services.</li> : services.map((service) => (
              <li key={service.service_id}><NavLink to={`/services/${service.service_id}`}>{service.service_name}</NavLink></li>
            ))}
          </ul>
        </div>
        <div className="panel-card">
          <h3>Recent bookings</h3>
          <ul className="list-plain">
            {bookings.length === 0 ? <li>No bookings yet.</li> : bookings.slice(0, 5).map((booking) => (
              <li key={booking.booking_id}>{booking.service_name} - {booking.status}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MyBookingsPage({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    try {
      const response = await api.get('/bookings/me');
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Failed to load bookings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadBookings();
  }, [user]);

  const cancelBooking = async (bookingId) => {
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      loadBookings();
    } catch (error) {
      console.error('Failed to cancel booking', error);
    }
  };

  if (!user) return <div className="page-shell"><p>Please login to view bookings.</p></div>;
  if (loading) return <div className="page-shell"><p>Loading your bookings...</p></div>;

  return (
    <div className="page-shell">
      <h2>My bookings</h2>
      {bookings.length === 0 ? (
        <div className="empty-state">You do not have any bookings yet.</div>
      ) : (
        <div className="booking-table">
          {bookings.map((booking) => (
            <div className="booking-card" key={booking.booking_id}>
              <div>
                <h4>{booking.service_name}</h4>
                <p>{booking.slot_date} — {booking.start_time} to {booking.end_time}</p>
              </div>
              <div className="booking-actions">
                <span className="status-pill">{booking.status}</span>
                {booking.status !== 'cancelled' && (
                  <button type="button" className="cta secondary" onClick={() => cancelBooking(booking.booking_id)}>Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ user }) {
  const [summary, setSummary] = useState(null);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ serviceName: '', description: '', location: '', openingTime: '09:00', closingTime: '17:00', bookingRules: '' });
  const [slotForm, setSlotForm] = useState({ slotDate: '', startTime: '09:00', endTime: '10:00', capacity: 4 });

  const loadAdminData = async () => {
    try {
      const [dashboardResponse, servicesResponse, bookingsResponse] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/services'),
        api.get('/admin/bookings'),
      ]);
      setSummary(dashboardResponse.data.summary);
      setServices(servicesResponse.data.services || []);
      setBookings(bookingsResponse.data.bookings || []);
    } catch (error) {
      console.error('Failed to load admin dashboard', error);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  const handleServiceSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/services', serviceForm);
      setServiceForm({ serviceName: '', description: '', location: '', openingTime: '09:00', closingTime: '17:00', bookingRules: '' });
      loadAdminData();
    } catch (error) {
      console.error('Failed to create service', error);
    }
  };

  const handleSlotSubmit = async (event) => {
    event.preventDefault();
    if (!selectedService) return;
    try {
      await api.post(`/services/${selectedService.service_id}/slots`, slotForm);
      setSlotForm({ slotDate: '', startTime: '09:00', endTime: '10:00', capacity: 4 });
      loadAdminData();
    } catch (error) {
      console.error('Failed to create slot', error);
    }
  };

  if (!user || user.role !== 'admin') {
    return <div className="page-shell"><p>Administrator access is required.</p></div>;
  }

  return (
    <div className="page-shell">
      <h2>Administrator dashboard</h2>
      {summary && (
        <div className="stats-grid">
          <div className="stat-card"><strong>{summary.totalUsers}</strong><span>Total users</span></div>
          <div className="stat-card"><strong>{summary.activeServices}</strong><span>Active services</span></div>
          <div className="stat-card"><strong>{summary.totalBookings}</strong><span>Total bookings</span></div>
          <div className="stat-card"><strong>{summary.pendingBookings}</strong><span>Pending</span></div>
          <div className="stat-card"><strong>{summary.confirmedBookings}</strong><span>Confirmed</span></div>
          <div className="stat-card"><strong>{summary.cancelledBookings}</strong><span>Cancelled</span></div>
        </div>
      )}

      <div className="panel-grid admin-layout">
        <div className="panel-card">
          <h3>Create service</h3>
          <form className="stack-form" onSubmit={handleServiceSubmit}>
            <input value={serviceForm.serviceName} onChange={(e) => setServiceForm({ ...serviceForm, serviceName: e.target.value })} placeholder="Service name" />
            <textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} placeholder="Description" />
            <input value={serviceForm.location} onChange={(e) => setServiceForm({ ...serviceForm, location: e.target.value })} placeholder="Location" />
            <div className="inline-fields">
              <input type="time" value={serviceForm.openingTime} onChange={(e) => setServiceForm({ ...serviceForm, openingTime: e.target.value })} />
              <input type="time" value={serviceForm.closingTime} onChange={(e) => setServiceForm({ ...serviceForm, closingTime: e.target.value })} />
            </div>
            <textarea value={serviceForm.bookingRules} onChange={(e) => setServiceForm({ ...serviceForm, bookingRules: e.target.value })} placeholder="Booking rules" />
            <button type="submit" className="cta primary">Add service</button>
          </form>
        </div>

        <div className="panel-card">
          <h3>Manage availability</h3>
          <select value={selectedService ? selectedService.service_id : ''} onChange={(e) => {
            const selected = services.find((service) => String(service.service_id) === e.target.value);
            setSelectedService(selected || null);
          }}>
            <option value="">Choose service</option>
            {services.map((service) => (
              <option key={service.service_id} value={service.service_id}>{service.service_name}</option>
            ))}
          </select>
          <form className="stack-form" onSubmit={handleSlotSubmit}>
            <input type="date" value={slotForm.slotDate} onChange={(e) => setSlotForm({ ...slotForm, slotDate: e.target.value })} />
            <div className="inline-fields">
              <input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} />
              <input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} />
            </div>
            <input type="number" min="1" value={slotForm.capacity} onChange={(e) => setSlotForm({ ...slotForm, capacity: e.target.value })} />
            <button type="submit" className="cta primary">Add slot</button>
          </form>
        </div>
      </div>

      <div className="panel-card booking-panel">
        <h3>All bookings</h3>
        {bookings.length === 0 ? (
          <div className="empty-state">No bookings yet.</div>
        ) : (
          <div className="admin-bookings-list">
            {bookings.map((booking) => (
              <div className="booking-card" key={booking.booking_id}>
                <div>
                  <strong>{booking.full_name}</strong>
                  <p>{booking.service_name} - {booking.slot_date} {booking.start_time}</p>
                </div>
                <div className="booking-actions">
                  <span className="status-pill">{booking.status}</span>
                  <select value={booking.status} onChange={async (e) => {
                    try {
                      await api.patch(`/admin/bookings/${booking.booking_id}/status`, { status: e.target.value });
                      loadAdminData();
                    } catch (error) {
                      console.error('Failed to update booking status', error);
                    }
                  }}>
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
