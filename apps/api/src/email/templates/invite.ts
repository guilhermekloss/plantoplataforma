export function inviteEmailHtml(params: { inviterName: string; inviterOrgName: string; acceptUrl: string }): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #dd5e2e;">Você foi convidado para a Plantor</h2>
      <p><strong>${params.inviterName}</strong> (${params.inviterOrgName}) convidou você para acessar a plataforma Plantor.</p>
      <p>
        <a href="${params.acceptUrl}" style="background:#dd5e2e;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
          Aceitar convite
        </a>
      </p>
      <p style="color:#666;font-size:12px;">Este link expira em 24 horas.</p>
    </div>
  `;
}
