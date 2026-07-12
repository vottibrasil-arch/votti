export type LegalSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  closing?: string[];
};

export type LegalDocument = {
  title: string;
  updatedAt?: string;
  intro?: string[];
  sections: LegalSection[];
};

export const VOTTI_TERMS_OF_USE: LegalDocument = {
  title: "Termos de Uso do VOTTI",
  updatedAt: "julho de 2026",
  intro: [
    "Bem-vindo ao VOTTI.",
    "O VOTTI é uma plataforma digital destinada à criação, organização, compartilhamento e acompanhamento de votações públicas e privadas, permitindo que usuários criem enquetes e acompanhem resultados em tempo real.",
    "Ao utilizar a plataforma, o usuário declara estar ciente e concorda com todas as condições abaixo.",
  ],
  sections: [
    {
      heading: "1. Responsabilidade do usuário",
      paragraphs: [
        "O usuário é integralmente responsável pelas votações, textos, imagens e conteúdos publicados dentro da plataforma.",
        "É proibido utilizar o VOTTI para:",
      ],
      bullets: [
        "divulgar conteúdo ilegal;",
        "promover violência;",
        "praticar discriminação;",
        "violar direitos autorais;",
        "difamar terceiros;",
        "divulgar informações falsas;",
        "praticar fraudes;",
        "utilizar a plataforma para atividades ilícitas.",
      ],
    },
    {
      heading: "2. Responsabilidade da plataforma",
      paragraphs: [
        "O VOTTI atua exclusivamente como uma plataforma tecnológica.",
        "O VOTTI:",
      ],
      bullets: [
        "não produz o conteúdo publicado pelos usuários;",
        "não garante a autenticidade das informações;",
        "não garante a identidade dos participantes;",
        "não garante a veracidade dos resultados;",
        "não garante validade jurídica, administrativa ou oficial das votações.",
      ],
      closing: [
        "Toda responsabilidade pelo conteúdo publicado é do usuário que criou a votação.",
      ],
    },
    {
      heading: "3. Remoção de conteúdo",
      paragraphs: [
        "O VOTTI poderá remover, suspender ou bloquear conteúdos e contas que:",
      ],
      bullets: [
        "violem estes termos;",
        "violem a legislação brasileira;",
        "prejudiquem outros usuários;",
        "utilizem a plataforma de maneira abusiva;",
        "comprometam a segurança do sistema.",
      ],
      closing: ["A remoção poderá ocorrer sem aviso prévio."],
    },
    {
      heading: "4. Disponibilidade do serviço",
      paragraphs: ["O VOTTI poderá passar por:"],
      bullets: [
        "manutenções;",
        "atualizações;",
        "interrupções temporárias;",
        "falhas técnicas;",
        "indisponibilidade parcial ou total.",
      ],
      closing: [
        "O VOTTI não se responsabiliza por prejuízos decorrentes dessas interrupções.",
      ],
    },
    {
      heading: "5. Propriedade intelectual",
      paragraphs: [
        "A marca VOTTI, seu logotipo, design, identidade visual e funcionalidades pertencem aos responsáveis pela plataforma.",
        "É proibida a reprodução, distribuição ou utilização sem autorização.",
      ],
    },
    {
      heading: "6. Alterações nos termos",
      paragraphs: [
        "Os Termos de Uso poderão ser atualizados a qualquer momento.",
        "A continuidade do uso da plataforma representa a concordância com as alterações realizadas.",
      ],
    },
    {
      heading: "7. Legislação aplicável",
      paragraphs: ["A utilização da plataforma será regida pela legislação brasileira."],
    },
  ],
};

export const VOTTI_PRIVACY_POLICY: LegalDocument = {
  title: "Política de Privacidade do VOTTI",
  updatedAt: "julho de 2026",
  intro: [
    "O VOTTI respeita a privacidade dos usuários e coleta apenas os dados necessários para o funcionamento da plataforma.",
  ],
  sections: [
    {
      heading: "1. Dados coletados",
      paragraphs: ["Podem ser armazenados:"],
      bullets: [
        "nome;",
        "e-mail;",
        "informações das votações criadas;",
        "registros técnicos de acesso;",
        "endereço IP;",
        "navegador utilizado;",
        "data e horário de utilização;",
        "informações necessárias para segurança do sistema.",
      ],
    },
    {
      heading: "2. Finalidade dos dados",
      paragraphs: ["Os dados poderão ser utilizados para:"],
      bullets: [
        "operar a plataforma;",
        "melhorar a experiência do usuário;",
        "garantir segurança;",
        "detectar abusos e fraudes;",
        "investigar denúncias;",
        "corrigir erros técnicos;",
        "cumprir obrigações legais.",
      ],
    },
    {
      heading: "3. Compartilhamento de dados",
      paragraphs: [
        "O VOTTI não comercializa dados pessoais.",
        "As informações somente poderão ser compartilhadas:",
      ],
      bullets: [
        "quando exigidas por lei;",
        "mediante ordem judicial;",
        "para proteção da plataforma;",
        "para investigação de fraudes e abusos.",
      ],
    },
    {
      heading: "4. Segurança",
      paragraphs: [
        "O VOTTI adota medidas técnicas e administrativas para proteger os dados armazenados.",
        "Apesar disso, nenhum sistema é completamente imune a falhas de segurança.",
      ],
    },
    {
      heading: "5. Exclusão de conta",
      paragraphs: [
        "O usuário poderá solicitar a exclusão da conta através dos canais oficiais de contato.",
      ],
    },
    {
      heading: "6. Alterações nesta política",
      paragraphs: [
        "A Política de Privacidade poderá ser atualizada periodicamente.",
        "O uso contínuo da plataforma representa a concordância com as alterações.",
      ],
    },
  ],
};
