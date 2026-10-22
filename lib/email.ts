import nodemailer from "nodemailer";


const EMAIL_USER = process.env.EMAIL_USER!;
const EMAIL_PASS = process.env.EMAIL_PASS!
const transporter = nodemailer.createTransport({
    host: "mail.smartflowalgo.com",
    port: 465,
    secure: true,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
    try {
        await transporter.verify()
        await transporter.sendMail({
            from: EMAIL_USER,
            to, subject, html
        });

        return true;
    } catch (error) {
        console.log("Email send error", error);
        return false;
    }
}

export default sendEmail;
