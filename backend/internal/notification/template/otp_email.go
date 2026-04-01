package template

import "fmt"

// OTPEmail returns an HTML email body for the OTP verification email.
func OTPEmail(displayName, code string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">🍞 Bakerio</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Email Verification</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi <strong>%s</strong>,</p>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Thanks for signing up! Use the verification code below to confirm your email address.
              </p>

              <!-- OTP Box -->
              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="background-color:#fff7ed;border:2px dashed #fb923c;border-radius:10px;padding:28px 20px;">
                    <p style="margin:0 0 6px;font-size:13px;color:#9a3412;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Your verification code</p>
                    <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:10px;color:#ea580c;font-family:'Courier New',monospace;">%s</p>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#fef9c3;border-left:4px solid #facc15;border-radius:0 6px 6px 0;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#713f12;">
                      ⏱ This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;">
                If you didn't create a Bakerio account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; 2026 Bakerio &mdash; Made with love for bakers everywhere.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, displayName, code)
}
