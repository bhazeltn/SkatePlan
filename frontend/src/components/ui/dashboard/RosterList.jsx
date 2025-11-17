import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function RosterList({ roster }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roster.map((skater) => (
        <Card key={skater.id}>
          <CardHeader>
            <CardTitle>{skater.full_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">DOB: {skater.date_of_birth}</p>
            <div className="mt-2">
              <h4 className="font-semibold">Disciplines:</h4>
              <ul className="list-disc pl-5">
                {skater.planning_entities.map((entity) => (
                  <li key={entity.id} className="text-sm">{entity.name || "Unknown Discipline"}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}