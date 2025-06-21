function sendMail() {
    const name = document.querySelector('#contact-form input[type="text"]').value;
    const email = document.querySelector('#contact-form input[type="email"]').value;
    const subject = document.querySelector('#contact-form input[type="text"]:nth-of-type(2)').value;
    const message = document.querySelector('#contact-form textarea').value;

    Email.send({
        Host: "smtp.elasticemail.com",
        Username: "raresmaier123@gmail.com",
        Password: process.env.SMTP_API_KEY,
        To: 'raresmaier123@gmail.com',
        From: email,
        Subject: `${subject} (de la ${name})`,
        Body: `
                <h3>Mesaj de la ${name}</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subiect:</strong> ${subject}</p>
                <p><strong>Mesaj:</strong><br>${message}</p>
            `
    }).then(function (message) {
        alert("Mesajul a fost trimis cu succes!");
        document.getElementById("contact-form").reset();
    }).catch(function (error) {
        alert("Eroare la trimitere: " + error);
    });
}
