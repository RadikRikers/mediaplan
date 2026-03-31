import { GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Learning() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center gap-3">
        <GraduationCap className="h-9 w-9 text-slate-700" aria-hidden />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Обучение</h1>
          <p className="text-gray-600 mt-1">Материалы, гайды и программа развития</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Скоро здесь</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            Раздел доступен руководству, сотрудникам медиаблока и сервисной учётной записи. Сюда можно
            добавить курсы, чек-листы и документацию по процессам.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
