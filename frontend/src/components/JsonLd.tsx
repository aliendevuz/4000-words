/** schema.org ma'lumotini sahifaga joylaydi. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Ma'lumot o'z konfiguratsiyamizdan keladi.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
