const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Function to fetch hotel data from your API
async function getHotelData() {
  try {
    const response = await axios.get(`${API_BASE_URL}/hotel`);
    return response.data;
  } catch (error) {
    console.error('Error fetching hotel data:', error);
    throw error;
  }
}

// Function to update room availability
async function updateRoomAvailability(roomId, dates, isAvailable) {
  try {
    const response = await axios.put(`${API_BASE_URL}/room/${roomId}/availability`, {
      dates,
      isAvailable
    });
    return response.data;
  } catch (error) {
    console.error('Error actualizando disponibilidad:', error);
    throw error;
  }
}

// Function to sync with OTA
async function syncWithOTA() {
  try {
    const hotelData = await getHotelData();
    
    // Prepare data for OTA
    const otaData = {
      hotelId: hotelData.id,
      rooms: hotelData.rooms.map(room => ({
        roomType: room.roomType,
        price: room.price,
        availability: room.availability
      }))
    };

    // Send data to OTA API
    const response = await axios.post('https://ota-api-endpoint.com/update', otaData, {
      headers: {
        'Authorization': `Bearer ${process.env.OTA_API_KEY}`
      }
    });

    console.log('Synced with OTA:', response.data);
  } catch (error) {
    console.error('Error syncing with OTA:', error);
  }
}

// Schedule OTA sync
cron.schedule('0 * * * *', () => {
  console.log('Running OTA sync');
  syncWithOTA();
});

// Endpoints
app.get('/api/hotel-data', async (req, res) => {
  try {
    const hotelData = await getHotelData();
    res.json(hotelData);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching hotel data' });
  }
});

app.get('/propiedades/:id/disponibilidad', async (req, res) => {
  const { id } = req.params;
  try {
    const hotelData = await getHotelData();
    const room = hotelData.rooms.find(r => r.id === id);
    if (!room) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }
    return dates;
}

app.get('/propiedades', (req, res) => {
    res.status(200).json(propiedades);
});

app.get('/propiedades/:id/disponibilidad', (req, res) => {
    const { id } = req.params;
    
    const propiedad = propiedades.find(p => p.id === id);

    if (!propiedad) {
        return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const disponibilidad = propiedad.disponibilidad;
    res.status(200).json(disponibilidad);
});

app.get('/buscar', (req, res) => {
    const { fechaInicio, fechaFin, tipo, ubicacion } = req.query;

    if (!fechaInicio || !fechaFin || !tipo || !ubicacion) {
        return res.status(400).json({ error: 'Faltan parámetros de búsqueda' });
    }

    const propiedadesDisponibles = propiedades.filter(propiedad => {
        const fechasReservadas = reservas.filter(reserva => 
            reserva.propiedadId === propiedad.id &&
            !(fechaFin < reserva.fechaInicio || fechaInicio > reserva.fechaFin)
        );

        const estaDisponible = fechasReservadas.length === 0; 
        const fechasDisponibles = propiedad.disponibilidad.filter(d => d.fecha >= fechaInicio && d.fecha <= fechaFin && d.disponible);      
        const cumpleTipo = propiedad.tipo === tipo;
        const cumpleUbicacion = propiedad.ubicacion.toLowerCase() === ubicacion.toLowerCase();

        return estaDisponible && fechasDisponibles.length === (new Date(fechaFin).getDate() - new Date(fechaInicio).getDate() + 1) && cumpleTipo && cumpleUbicacion;
    });

    res.status(200).json(propiedadesDisponibles);
});

app.post('/reservas', (req, res) => {
    const { usuarioId, propiedadId, fechaInicio, fechaFin } = req.body;

  if (!usuarioId || !propiedadId || !fechaInicio || !fechaFin || !roomType) {
    return res.status(400).json({ error: 'Missing required reservation data' });
  }

  try {
    const hotelData = await getHotelData();
    const room = hotelData.rooms.find(r => r.roomType === roomType);
    
    if (!room) {
      return res.status(404).json({ error: 'Room type not found' });
    }

    const fechasReservadas = reservas.filter(r => r.propiedadId === propiedadId && 
        (fechaInicio <= r.fechaFin && fechaFin >= r.fechaInicio));

    if (fechasReservadas.length > 0) {
        return res.status(400).json({ error: 'La propiedad no está disponible en las fechas seleccionadas' });
    }

    const nuevaReserva = { 
        id: (reservas.length + 1).toString(), 
        usuarioId, 
        propiedadId, 
        fechaInicio, 
        fechaFin, 
        estado: 'confirmada' 
    };

    reservas.push(nuevaReserva);

    const fechas = getDatesBetween(new Date(fechaInicio), new Date(fechaFin));
    fechas.forEach(fecha => {
        const disponibilidad = propiedad.disponibilidad.find(d => d.fecha === fecha);
        if (disponibilidad) {
            disponibilidad.disponible = false;
        }
    });

    res.status(201).json(nuevaReserva);
});

app.get('/reservas', (req, res) => {
    res.status(200).json(reservas);
});

app.get('/usuarios/:usuarioId/reservas', (req, res) => {
    const { usuarioId } = req.params;
    const reservasUsuario = reservas.filter(r => r.usuarioId === usuarioId);
    res.status(200).json(reservasUsuario);
});

app.get('/reservas', async (req, res) => {
  try {
    const reservationsResponse = await axios.get(`${API_BASE_URL}/reservations`);
    res.status(200).json(reservationsResponse.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching reservations' });
  }
});

app.get('/usuarios/:usuarioId/reservas', async (req, res) => {
  const { usuarioId } = req.params;
  try {
    const reservationsResponse = await axios.get(`${API_BASE_URL}/reservations?usuarioId=${usuarioId}`);
    res.status(200).json(reservationsResponse.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user reservations' });
  }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

/*
GET /propiedades: Obtiene la lista de propiedades.
GET /propiedades/
/disponibilidad: Verifica la disponibilidad de una propiedad.
POST /reservas: Crea una nueva reserva.
GET /reservas: Obtiene todas las reservas.
GET /usuarios/
/reservas: Obtiene las reservas de un usuario específico.
*/