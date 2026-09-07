(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/donors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Migraine',
        phone: '+919999000003',
        email: 'testmigraine3@example.com',
        blood_group: 'O+',
        medical_conditions: ['Migraine'],
        latitude: 12.9716,
        longitude: 77.5946,
        donation_consent: true,
        emergency_contact_consent: true,
        is_available: true
      })
    });

    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
