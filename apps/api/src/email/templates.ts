/**
 * Templates HTML simples de email (MVP).
 * Na Fase 02 podem ser migrados para componentes React Email.
 */

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
      <div style="background:#16a34a;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;font-size:20px;font-weight:bold;">
        Plantor
      </div>
      <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e4e4e7;">
        <h1 style="font-size:18px;margin:0 0 16px;">${title}</h1>
        ${body}
      </div>
      <p style="color:#71717a;font-size:12px;margin-top:16px;text-align:center;">
        Plantor — contratos de grãos. Se você não esperava este email, ignore-o.
      </p>
    </div>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">${label}</a>`;
}

export interface ContractAwaitingSignatureParams {
  contractNumber: string;
  url: string;
}

export function contractAwaitingSignatureEmail({
  contractNumber,
  url,
}: ContractAwaitingSignatureParams): { subject: string; html: string } {
  return {
    subject: 'Novo contrato aguarda sua assinatura',
    html: layout(
      'Novo contrato aguarda sua assinatura',
      `<p style="font-size:14px;line-height:1.6;">O contrato <strong>${contractNumber}</strong> está aguardando a sua assinatura digital.</p>
       <p style="margin:24px 0;">${button(url, 'Ver e assinar contrato')}</p>`,
    ),
  };
}

export function contractSignedByProducerEmail({
  contractNumber,
}: {
  contractNumber: string;
}): { subject: string; html: string } {
  return {
    subject: `Contrato ${contractNumber} assinado pelo produtor`,
    html: layout(
      'Contrato assinado pelo produtor',
      `<p style="font-size:14px;line-height:1.6;">O produtor assinou o contrato <strong>${contractNumber}</strong>.</p>`,
    ),
  };
}

export function contractActiveEmail({
  contractNumber,
}: {
  contractNumber: string;
}): { subject: string; html: string } {
  return {
    subject: `Contrato ${contractNumber} ativo — entregas podem ser registradas`,
    html: layout(
      'Contrato ativo',
      `<p style="font-size:14px;line-height:1.6;">O contrato <strong>${contractNumber}</strong> foi assinado por ambas as partes e está ativo. As entregas já podem ser registradas.</p>`,
    ),
  };
}

export function contractDeadlineWarningEmail({
  contractNumber,
  deliveryDate,
}: {
  contractNumber: string;
  deliveryDate: string;
}): { subject: string; html: string } {
  return {
    subject: `⚠️ Entrega vence em 30 dias — ${contractNumber}`,
    html: layout(
      'Entrega vence em 30 dias',
      `<p style="font-size:14px;line-height:1.6;">A entrega do contrato <strong>${contractNumber}</strong> vence em <strong>${deliveryDate}</strong> (em ~30 dias).</p>
       <p style="font-size:14px;line-height:1.6;">Acompanhe o status das entregas no painel.</p>`,
    ),
  };
}

export function contractDisputeEmail({
  contractNumber,
  reason,
}: {
  contractNumber: string;
  reason: string;
}): { subject: string; html: string } {
  return {
    subject: `Atenção: disputa aberta no contrato ${contractNumber}`,
    html: layout(
      'Disputa aberta',
      `<p style="font-size:14px;line-height:1.6;">Foi aberta uma disputa no contrato <strong>${contractNumber}</strong>.</p>
       <p style="font-size:14px;line-height:1.6;background:#fef2f2;border-radius:6px;padding:12px;">Motivo: ${reason}</p>`,
    ),
  };
}

export interface InviteEmailParams {
  inviterName: string;
  acceptUrl: string;
}

export function inviteEmail({ inviterName, acceptUrl }: InviteEmailParams): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Você foi convidado para a Plantor',
    html: layout(
      'Você foi convidado',
      `<p style="font-size:14px;line-height:1.6;">
        <strong>${inviterName}</strong> convidou você para acessar a Plantor e gerenciar seus
        contratos de grãos.
      </p>
      <p style="font-size:14px;line-height:1.6;">Crie sua senha para começar:</p>
      <p style="margin:24px 0;">${button(acceptUrl, 'Aceitar convite')}</p>
      <p style="font-size:13px;color:#71717a;">Este convite expira em 24 horas.</p>`,
    ),
  };
}
