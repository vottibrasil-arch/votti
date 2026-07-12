export type LegalDocument = {
  title: string;
  sections: { heading?: string; paragraphs: string[] }[];
};

export const VOTTI_TERMS_OF_USE: LegalDocument = {
  title: "Termos de Uso",
  sections: [
    {
      paragraphs: [
        "Estes Termos de Uso regulam o acesso e a utilização da plataforma VOTTI. Ao criar uma conta ou utilizar o serviço, você declara ter lido e concordado com estas condições.",
      ],
    },
    {
      heading: "1. O serviço",
      paragraphs: [
        "O VOTTI é uma plataforma para criação e gestão de votações online. O organizador é responsável pelo conteúdo das enquetes, pela divulgação dos links e pelo uso adequado dos resultados.",
      ],
    },
    {
      heading: "2. Conta do usuário",
      paragraphs: [
        "Você deve fornecer informações verdadeiras e manter a confidencialidade da sua senha. É proibido usar o VOTTI para fins ilegais, fraudulentos ou que violem direitos de terceiros.",
      ],
    },
    {
      heading: "3. Votações e participantes",
      paragraphs: [
        "Cada votação pode ter regras definidas pelo organizador (por exemplo, um voto por pessoa). O VOTTI emprega medidas técnicas para reduzir abusos, sem garantir ausência total de tentativas de fraude.",
      ],
    },
    {
      heading: "4. Propriedade e licença",
      paragraphs: [
        "O software, a marca e a interface do VOTTI pertencem aos seus titulares. Você recebe uma licença limitada, não exclusiva e revogável para usar a plataforma conforme estes Termos.",
      ],
    },
    {
      heading: "5. Limitação de responsabilidade",
      paragraphs: [
        "O VOTTI é fornecido \"como está\", dentro dos limites permitidos pela lei. Não nos responsabilizamos por decisões tomadas com base nos resultados das votações nem por indisponibilidades temporárias do serviço.",
      ],
    },
    {
      heading: "6. Alterações",
      paragraphs: [
        "Podemos atualizar estes Termos periodicamente. O uso continuado da plataforma após alterações constitui aceite das novas condições.",
      ],
    },
  ],
};

export const VOTTI_PRIVACY_POLICY: LegalDocument = {
  title: "Política de Privacidade",
  sections: [
    {
      paragraphs: [
        "Esta Política de Privacidade descreve como o VOTTI trata dados pessoais de organizadores e participantes, em conformidade com a legislação brasileira aplicável, incluindo a LGPD.",
      ],
    },
    {
      heading: "1. Dados que coletamos",
      paragraphs: [
        "Organizadores: nome, e-mail e dados de perfil necessários para autenticação e gestão de votações.",
        "Participantes: identificadores técnicos para controle de voto (como token anônimo), opção escolhida e momento do voto, conforme a configuração de cada enquete.",
      ],
    },
    {
      heading: "2. Finalidade do tratamento",
      paragraphs: [
        "Utilizamos os dados para autenticar usuários, operar votações, exibir resultados, prevenir abusos, melhorar o serviço e cumprir obrigações legais.",
      ],
    },
    {
      heading: "3. Compartilhamento",
      paragraphs: [
        "Podemos utilizar provedores de infraestrutura (como hospedagem e banco de dados) que processam dados em nosso nome, com contratos adequados de proteção. Não vendemos dados pessoais.",
      ],
    },
    {
      heading: "4. Retenção e segurança",
      paragraphs: [
        "Mantemos os dados pelo tempo necessário à operação do serviço e obrigações legais. Aplicamos medidas técnicas e organizacionais para proteger as informações contra acesso não autorizado.",
      ],
    },
    {
      heading: "5. Seus direitos",
      paragraphs: [
        "Você pode solicitar acesso, correção, exclusão ou portabilidade dos seus dados, bem como revogar consentimentos quando aplicável, pelos canais de contato do VOTTI.",
      ],
    },
    {
      heading: "6. Contato",
      paragraphs: [
        "Para dúvidas sobre privacidade ou exercício de direitos, entre em contato pelo site institucional do VOTTI.",
      ],
    },
  ],
};
