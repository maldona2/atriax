import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    q: '¿Mis datos están seguros?',
    a: 'Absolutamente. Utilizamos encriptación de grado empresarial, controles de acceso robustos y alojamiento seguro. Tus datos te pertenecen y nunca los compartimos con terceros.',
  },
  {
    q: '¿Cómo es el proceso de migración?',
    a: 'Nuestro equipo te ayuda a importar tus datos existentes. Ofrecemos herramientas de importación y asistencia personalizada para que la transición sea fluida.',
  },
  {
    q: '¿Ofrecen capacitación y soporte?',
    a: 'Sí. Incluimos onboarding guiado, documentación completa, videos tutoriales y soporte por chat y email. Para planes empresariales, ofrecemos capacitación presencial.',
  },
  {
    q: '¿Funciona en móvil y tablet?',
    a: 'Atriax es completamente responsive. Funciona en cualquier navegador moderno, en cualquier dispositivo. También tenemos apps nativas en desarrollo.',
  },
  {
    q: '¿Cuál es la diferencia entre prueba gratis y plan de pago?',
    a: 'La prueba gratis incluye todas las funcionalidades durante 14 días. Al terminar, eliges el plan que mejor se adapte a tu práctica. Sin compromiso.',
  },
  {
    q: '¿Soportan múltiples clínicas o sedes?',
    a: 'Sí. Nuestra arquitectura multi-tenant permite gestionar varias clínicas desde una sola cuenta de super administrador con visibilidad centralizada.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí. No hay contratos a largo plazo. Puedes cancelar tu suscripción cuando quieras y seguirás teniendo acceso hasta el final del período pagado.',
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
              Preguntas frecuentes
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-foreground">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
