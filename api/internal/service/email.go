package service

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/aws/aws-sdk-go-v2/service/sesv2/types"

	"github.com/joaoleau/floslo/internal/config/logger"
)

type EmailService struct {
	SESClient   *sesv2.Client
	SenderEmail string
}

func NewEmailService(sesClient *sesv2.Client, senderEmail string) *EmailService {
	return &EmailService{
		SESClient:   sesClient,
		SenderEmail: senderEmail,
	}
}

func codeEmailHTML(username string, title string, bodyText string, code string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#F9FAFB;">
    <div style="background-color:#F9FAFB;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:420px;margin:0 auto;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E9EF;">
        <div style="padding:32px 28px;">
          <p style="color:#484F5B;font-size:14px;margin:0 0 4px;">Olá, %s</p>
          <h1 style="color:#181C25;font-size:20px;font-weight:800;margin:0 0 8px;">%s</h1>
          <p style="color:#484F5B;font-size:14px;line-height:1.6;margin:0 0 24px;">%s</p>
          <div style="background-color:#F9FAFB;border:2px solid #F59E0B;border-radius:16px;padding:20px;text-align:center;margin-bottom:24px;">
            <div style="color:#181C25;font-size:32px;font-weight:800;letter-spacing:8px;font-family:monospace;">%s</div>
          </div>
          <p style="color:#9CA3AF;font-size:12px;line-height:1.5;margin:0;">Esse código expira em 15 minutos. Se você não pediu isso, pode ignorar este e-mail com segurança.</p>
        </div>
      </div>
    </div>
  </body>
</html>`, username, title, bodyText, code)
}

func (s *EmailService) sendSimpleEmail(ctx context.Context, toEmail string, subject string, textBody string, htmlBody string) error {
	charset := aws.String("UTF-8")
	_, err := s.SESClient.SendEmail(ctx, &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.SenderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{toEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{Data: aws.String(subject), Charset: charset},
				Body: &types.Body{
					Text: &types.Content{Data: aws.String(textBody), Charset: charset},
					Html: &types.Content{Data: aws.String(htmlBody), Charset: charset},
				},
			},
		},
	})
	if err != nil {
		logger.Log.Error("failed to send email: ", logger.Any("error", err), logger.String("subject", subject))
		return fmt.Errorf("failed to send email: %w", err)
	}
	return nil
}

func (s *EmailService) SendPasswordResetCode(ctx context.Context, toEmail string, username string, code string) error {
	title := "Seu código de recuperação de senha"
	bodyText := "Use o código abaixo para redefinir sua senha no Floslo."
	textEmail := fmt.Sprintf(
		"Olá, %s\n\nUse o código abaixo para redefinir sua senha no Floslo:\n\n%s\n\nEsse código expira em 15 minutos. Se você não pediu essa recuperação, pode ignorar este e-mail.",
		username, code,
	)
	htmlEmail := codeEmailHTML(username, title, bodyText, code)
	return s.sendSimpleEmail(ctx, toEmail, "Seu código de recuperação de senha - Floslo", textEmail, htmlEmail)
}
