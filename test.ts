async function test() {
  try {
    const res = await fetch('https://data.investing.com/api/s/track', {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch (e) {
    console.error(e);
  }
}
test();
